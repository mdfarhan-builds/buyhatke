"""Conservative deterministic SKU identity checks; titles alone never establish identity."""

from dataclasses import dataclass
import re

from .models import Product, UNKNOWN, normalized

CATEGORY_DIMENSIONS = {
    "smartphone": {"storage", "color", "generation", "pack_size"},
    "tablet": {"storage", "color", "generation", "pack_size"},
    "laptop": {"storage", "ram", "color", "generation", "pack_size"},
    "audio": {"color", "generation", "pack_size"},
    "appliance": {"color", "pack_size"},
}
SPEC_DIMENSIONS = {"storage": "storage", "storage capacity": "storage", "color": "color", "colour": "color", "generation": "generation", "pack size": "pack_size", "pack_size": "pack_size", "ram": "ram"}
CAPACITY_PATTERN = re.compile(r"\b(\d+(?:\.\d+)?)\s*(TB|GB|MB)\b", re.IGNORECASE)
COLOR_PATTERN = re.compile(r"\b(black|white|blue|green|red|pink|purple|yellow|orange|silver|gold|grey|gray|midnight|starlight|obsidian|hazel|graphite|lavender|cream)\b", re.IGNORECASE)
PACK_PATTERN = re.compile(r"\b(\d+)\s*[- ]?(?:pack|pcs|pieces|units)\b|\bpack\s+of\s+(\d+)\b", re.IGNORECASE)


def variant_value(key: str, value: str) -> str:
    value = normalized(value)
    return value.replace(" ", "") if key in {"storage", "ram"} else value


def consistent_metadata(product: Product) -> bool:
    for label, value in product.specifications.items():
        dimension = SPEC_DIMENSIONS.get(normalized(label))
        if dimension:
            actual = product.variant.get(dimension, "")
            if not actual or variant_value(dimension, actual) != variant_value(dimension, value):
                return False
    # Titles support structured evidence. An explicit contradictory dimension
    # invalidates the listing even when its structured fields claim agreement.
    allowed_capacities = {variant_value(key, value) for key, value in product.variant.items() if re.fullmatch(r"\d+(?:\.\d+)?\s*(?:TB|GB|MB)", value, flags=re.IGNORECASE)}
    for match in CAPACITY_PATTERN.finditer(product.name):
        capacity = f"{match.group(1)}{match.group(2)}".casefold()
        before, after = product.name[max(0, match.start() - 12):match.start()], product.name[match.end():match.end() + 15]
        label = "ram" if re.search(r"\bRAM\s*[:=-]?\s*$", before, flags=re.IGNORECASE) or re.match(r"\s*(?:[-:]\s*)?RAM\b", after, flags=re.IGNORECASE) else "storage" if re.search(r"\b(?:storage|ROM|SSD|HDD)\s*[:=-]?\s*$", before, flags=re.IGNORECASE) or re.match(r"\s*(?:[-:]\s*)?(?:storage|ROM|SSD|HDD)\b", after, flags=re.IGNORECASE) else None
        if label and capacity != variant_value(label, product.variant.get(label, "")):
            return False
        if capacity not in allowed_capacities:
            return False
    title_colors = {color.casefold() for color in COLOR_PATTERN.findall(product.name)}
    color = normalized(product.variant.get("color", ""))
    declared_colors = {value.casefold() for value in COLOR_PATTERN.findall(color)}
    if color and title_colors and not (title_colors & declared_colors) and color not in normalized(product.name):
        return False
    generation = normalized(product.variant.get("generation", ""))
    pack_size = normalized(product.variant.get("pack_size", ""))
    if pack_size.isdigit() and any((a or b) != pack_size for a, b in PACK_PATTERN.findall(product.name)):
        return False
    explicit_generations = re.findall(r"\b(?:gen(?:eration)?)\s*[-:]?\s*(\d+)\b|\b(\d+)(?:st|nd|rd|th)?\s*gen(?:eration)?\b", product.name, flags=re.IGNORECASE)
    if generation.isdigit() and any((a or b) != generation for a, b in explicit_generations):
        return False
    if re.fullmatch(r"\d{1,3}", generation):
        families = re.findall(r"\b(?:iphone|pixel|galaxy\s*[saz]|oneplus)\s*(\d{1,3})", product.name, flags=re.IGNORECASE)
        if families and any(value != generation for value in families):
            return False
        without_capacities = CAPACITY_PATTERN.sub("", product.name)
        without_packs = PACK_PATTERN.sub("", without_capacities)
        without_metrics = re.sub(r"\b\d+(?:\.\d+)?\s*[- ]?(?:core|inch|inches|hz|mah|mp|watt|w)\b", "", without_packs, flags=re.IGNORECASE)
        remaining_numbers = re.findall(r"\b\d{1,3}\b", without_metrics)
        if len(remaining_numbers) == 1 and remaining_numbers[0] != generation:
            return False
    return True


@dataclass(frozen=True)
class Match:
    verified: bool
    confidence: int
    reason: str


def dimensions(product: Product) -> set[str]:
    return set(product.required_variant_fields) | set(product.variant) | CATEGORY_DIMENSIONS.get(product.category, set())


def complete_identity(product: Product) -> bool:
    if normalized(product.brand) in UNKNOWN or normalized(product.model) in UNKNOWN:
        return False
    return bool(dimensions(product)) and all(
        normalized(product.variant.get(key, "")) not in UNKNOWN for key in dimensions(product)
    )


def gtins(product: Product) -> set[str]:
    return {value.zfill(14) for key, value in product.identifiers.items() if key in {"gtin", "ean", "upc", "isbn13"}}


def exact_match(source: Product, candidate: Product) -> Match:
    if normalized(source.brand) != normalized(candidate.brand):
        return Match(False, 0, "Brand differs from the original product.")
    if source.category != candidate.category:
        return Match(False, 0, "Product categories differ.")
    if not consistent_metadata(source) or not consistent_metadata(candidate):
        return Match(False, 0, "The product title or specifications conflict with its declared variant.")
    if not complete_identity(source) or not complete_identity(candidate):
        return Match(False, 0, "Exact variant verification is incomplete; a required variant value is unknown.")
    for key in sorted(dimensions(source) | dimensions(candidate)):
        a, b = variant_value(key, source.variant.get(key, "")), variant_value(key, candidate.variant.get(key, ""))
        if a in UNKNOWN or b in UNKNOWN:
            return Match(False, 0, f"The {key.replace('_', ' ')} variant could not be verified at both stores.")
        if a != b:
            return Match(False, 0, f"The {key.replace('_', ' ')} variant differs from the original product.")
    source_gtins, candidate_gtins = gtins(source), gtins(candidate)
    if source_gtins and candidate_gtins and not source_gtins.intersection(candidate_gtins):
        return Match(False, 0, "Global product identifiers conflict.")
    if normalized(source.model) != normalized(candidate.model):
        return Match(False, 0, "Manufacturer model numbers differ.")
    source_mpn = normalized(source.identifiers.get("mpn", ""))
    candidate_mpn = normalized(candidate.identifiers.get("mpn", ""))
    if source_mpn and candidate_mpn and source_mpn != candidate_mpn:
        return Match(False, 0, "Manufacturer part numbers conflict.")
    if source_gtins.intersection(candidate_gtins):
        return Match(True, 100, "Matching global identifier, manufacturer model, and every declared variant.")
    if source_mpn and source_mpn == candidate_mpn:
        return Match(True, 98, "Matching manufacturer part number, brand, model, and every declared variant.")
    return Match(True, 95, "Matching manufacturer brand, exact model number, and every declared variant.")
