from datetime import datetime, timezone
from decimal import Decimal
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

UNKNOWN = {"", "unknown", "unspecified", "n/a", "none", "not specified"}


def normalized(value: str) -> str:
    return " ".join(value.casefold().strip().split())


def valid_gtin(value: str) -> bool:
    if not re.fullmatch(r"[0-9]+", value) or len(value) not in (8, 12, 13, 14):
        return False
    # GS1 modulo-10 checksum, starting at the rightmost data digit.
    weighted = sum(int(digit) * (3 if index % 2 == 0 else 1) for index, digit in enumerate(reversed(value[:-1])))
    return (10 - weighted % 10) % 10 == int(value[-1]) and int(value) > 0


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Product(StrictModel):
    name: str = Field(min_length=2, max_length=300)
    brand: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    category: Literal["smartphone", "tablet", "laptop", "audio", "appliance", "other"] = "other"
    variant: dict[str, str] = Field(default_factory=dict, max_length=24)
    # The authorized source must declare every dimension that distinguishes SKUs.
    required_variant_fields: list[str] = Field(min_length=1, max_length=24)
    identifiers: dict[str, str] = Field(default_factory=dict, max_length=12)
    image_url: HttpUrl | None = None
    specifications: dict[str, str] = Field(default_factory=dict, max_length=40)

    @field_validator("variant", "specifications", "identifiers")
    @classmethod
    def bounded_values(cls, value: dict[str, str]) -> dict[str, str]:
        if any(len(k) > 100 or len(v) > 500 for k, v in value.items()):
            raise ValueError("Product metadata exceeds maximum length")
        return value

    @field_validator("identifiers")
    @classmethod
    def check_identifiers(cls, value: dict[str, str]) -> dict[str, str]:
        allowed = {"gtin", "ean", "upc", "isbn13", "mpn"}
        if set(value) - allowed:
            raise ValueError("Unsupported identifier type")
        for key, identifier in value.items():
            if key in {"gtin", "ean", "upc", "isbn13"} and not valid_gtin(identifier):
                raise ValueError(f"Invalid {key} checksum or length")
            if key == "ean" and len(identifier) not in (8, 13):
                raise ValueError("EAN requires 8 or 13 digits")
            if key == "upc" and len(identifier) != 12:
                raise ValueError("UPC requires 12 digits")
            if key == "isbn13" and (len(identifier) != 13 or not identifier.startswith(("978", "979"))):
                raise ValueError("ISBN-13 requires a 978 or 979 prefix")
        global_ids = {identifier.zfill(14) for key, identifier in value.items() if key in {"gtin", "ean", "upc", "isbn13"}}
        if len(global_ids) > 1:
            raise ValueError("Global identifiers within one product conflict")
        return value

    @field_validator("image_url")
    @classmethod
    def https_image(cls, value: HttpUrl | None) -> HttpUrl | None:
        if value and value.scheme != "https":
            raise ValueError("Images require HTTPS")
        return value


class ConditionalDiscount(StrictModel):
    label: str = Field(min_length=1, max_length=120)
    amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    conditions: str = Field(min_length=1, max_length=500)


class FeedOffer(StrictModel):
    retailer: Literal["amazon", "flipkart", "croma", "reliance", "vijay"]
    url: str = Field(max_length=2048)
    product: Product
    price: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    shipping: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    mandatory_fees: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    currency: Literal["INR"] = "INR"
    availability: Literal["in_stock", "out_of_stock", "unknown"] = "unknown"
    last_checked: datetime
    conditional_discounts: list[ConditionalDiscount] = Field(default_factory=list, max_length=15)

    @field_validator("last_checked")
    @classmethod
    def aware_timestamp(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("last_checked must include its timezone")
        return value.astimezone(timezone.utc)

    @model_validator(mode="after")
    def correct_retailer(self) -> "FeedOffer":
        from .urls import validate_product_url

        parsed = validate_product_url(self.url)
        if parsed.retailer.id != self.retailer:
            raise ValueError("Offer URL and retailer do not match")
        self.url = parsed.canonical_url
        return self


class Authorization(StrictModel):
    authorized: Literal[True]
    provider: str = Field(min_length=2, max_length=200)
    reference: str = Field(min_length=2, max_length=500)


class AuthorizedFeed(StrictModel):
    schema_version: Literal[1]
    authorization: Authorization
    offers: list[FeedOffer] = Field(max_length=10000)

    @model_validator(mode="after")
    def unique_product_urls(self) -> "AuthorizedFeed":
        from .urls import validate_product_url

        keys = [validate_product_url(offer.url).key for offer in self.offers]
        if len(set(keys)) != len(keys):
            raise ValueError("Feed contains duplicate retailer product identifiers")
        return self


class CompareRequest(StrictModel):
    url: str = Field(min_length=1, max_length=2048)


class Offer(StrictModel):
    id: str
    retailer: str
    url: str | None
    price: Decimal | None = None
    shipping: Decimal | None = None
    mandatory_fees: Decimal | None = None
    total: Decimal | None = None
    currency: Literal["INR"] = "INR"
    status: Literal["verified", "unavailable", "stale", "mismatch", "out_of_stock", "incomplete"]
    reason: str
    last_checked: datetime | None = None
    match_confidence: int = Field(default=0, ge=0, le=100)
    availability: Literal["in_stock", "out_of_stock", "unknown"] = "unknown"
    conditional_discounts: list[ConditionalDiscount] = Field(default_factory=list)
    source_kind: Literal["authorized_feed", "unconfigured"]
    cached: bool = False


class Coverage(StrictModel):
    checked: int
    supported: int
    verified: int
    retailers: list[str]
    configured: int


class Step(StrictModel):
    id: str
    label: str
    status: Literal["complete", "unavailable"]


class Comparison(StrictModel):
    status: Literal["complete", "unavailable"]
    source_retailer: str
    product: Product | None
    offers: list[Offer]
    best_offer_id: str | None
    coverage: Coverage
    steps: list[Step]
    message: str
    data_mode: Literal["authorized_feed", "unconfigured"]
    generated_at: datetime
