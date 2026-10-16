"""Strict product URL parsing. Submitted URLs are never fetched by this service."""

import re
from dataclasses import dataclass
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit


@dataclass(frozen=True)
class Retailer:
    id: str
    name: str
    domains: tuple[str, ...]


RETAILERS = (
    Retailer("amazon", "Amazon", ("amazon.in", "www.amazon.in", "m.amazon.in")),
    Retailer("flipkart", "Flipkart", ("flipkart.com", "www.flipkart.com", "m.flipkart.com")),
    Retailer("croma", "Croma", ("croma.com", "www.croma.com")),
    Retailer("reliance", "Reliance Digital", ("reliancedigital.in", "www.reliancedigital.in")),
    Retailer("vijay", "Vijay Sales", ("vijaysales.com", "www.vijaysales.com")),
)
DOMAIN_MAP = {domain: retailer for retailer in RETAILERS for domain in retailer.domains}


@dataclass(frozen=True)
class ProductURL:
    retailer: Retailer
    product_id: str
    canonical_url: str

    @property
    def key(self) -> str:
        return f"{self.retailer.id}:{self.product_id}"


def validate_product_url(raw: str) -> ProductURL:
    if not isinstance(raw, str) or len(raw) > 2048:
        raise ValueError("Enter a product URL of at most 2,048 characters.")
    raw = raw.strip()
    if not raw or re.search(r"[\x00-\x20\x7f\\]", raw):
        raise ValueError("The product URL contains unsafe or invalid characters.")
    try:
        parts = urlsplit(raw)
        port = parts.port
    except ValueError as exc:
        raise ValueError("Enter a valid HTTPS product URL.") from exc
    if parts.scheme != "https" or parts.username is not None or parts.password is not None:
        raise ValueError("Use an HTTPS product URL without embedded credentials.")
    if port not in (None, 443):
        raise ValueError("Custom URL ports are not supported.")
    hostname = (parts.hostname or "").lower()
    retailer = DOMAIN_MAP.get(hostname)
    if retailer is None:
        raise ValueError("Unsupported retailer. Use a direct Amazon India, Flipkart, Croma, Reliance Digital, or Vijay Sales product link.")
    if re.search(r"%(?:2f|5c|00|0a|0d)", parts.path, re.IGNORECASE) or "/../" in parts.path:
        raise ValueError("The product URL contains an unsafe path.")
    path = parts.path.rstrip("/")
    product_id: str | None = None
    query = ""
    if retailer.id == "amazon":
        match = re.search(r"/(?:dp|gp/product)/([A-Za-z0-9]{10})(?:/|$)", path)
        if match:
            product_id = match.group(1).upper()
            path = f"/dp/{product_id}"
    elif retailer.id == "flipkart":
        match = re.search(r"/p/(itm[a-zA-Z0-9]+)(?:/|$)", path)
        pid = parse_qs(parts.query).get("pid", [None])[0]
        if match and pid and re.fullmatch(r"[A-Za-z0-9]{8,40}", pid):
            product_id = pid.upper()
            query = urlencode({"pid": product_id})
        elif match:
            product_id = match.group(1).lower()
    elif retailer.id in ("croma", "reliance"):
        match = re.search(r"/p/([0-9]{3,20})(?:/|$)", path)
        if match:
            product_id = match.group(1)
    else:
        match = re.search(r"/p/([0-9]{2,20})(?:/|$)", path)
        slug = re.fullmatch(r"/product/([a-zA-Z0-9][a-zA-Z0-9_-]{3,200})", path)
        if match:
            product_id = match.group(1)
        elif slug:
            product_id = slug.group(1).lower()
    if product_id is None:
        raise ValueError("Use a direct product page link, rather than a store homepage, search, or shortened URL.")
    return ProductURL(retailer, product_id, urlunsplit(("https", hostname, path, query, "")))
