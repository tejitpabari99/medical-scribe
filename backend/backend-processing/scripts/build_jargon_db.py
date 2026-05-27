"""
build_jargon_db.py - Validate JSON source files for deterministic term detection.

Runtime term detection reads data/jargon/*.json directly. This script is kept
as a compatibility entry point for checking that the small source files have
the expected shape and can produce lookup aliases.

Run from the backend-processing directory:
    python scripts/build_jargon_db.py
"""

import json
import logging
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from utils.text_normalization import inflected_aliases, normalize, term_aliases

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(BASE_DIR, "data", "jargon")
SOURCES_PATH = os.path.join(DATA_DIR, "sources.json")
AHRQ_PATH = os.path.join(DATA_DIR, "ahrq_plain_language.json")
MICHIGAN_PATH = os.path.join(DATA_DIR, "michigan_medical_dictionary.json")
ABBREVIATIONS_PATH = os.path.join(DATA_DIR, "abbreviations.json")


def _load_json(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _require_string(record: dict, key: str, context: str) -> None:
    value = record.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{context}: expected non-empty string at {key!r}")


def _validate_sources() -> dict:
    sources = _load_json(SOURCES_PATH)
    required_sources = {
        "ahrq_plain_language": "ahrq_plain_language.json",
        "michigan_medical_dictionary": "michigan_medical_dictionary.json",
        "local_abbreviations": "abbreviations.json",
    }
    for key, file_name in required_sources.items():
        if key not in sources:
            raise ValueError(f"sources.json: missing {key!r}")
        source = sources[key]
        _require_string(source, "name", f"sources.json {key}")
        if source.get("fileName") != file_name:
            raise ValueError(
                f"sources.json {key}: expected fileName {file_name!r}, "
                f"got {source.get('fileName')!r}"
            )
    return sources


def _validate_ahrq() -> tuple[int, int]:
    records = _load_json(AHRQ_PATH)
    if not isinstance(records, list):
        raise ValueError("ahrq_plain_language.json: expected a list")

    alias_count = 0
    seen: set[tuple[str, str]] = set()
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            raise ValueError(f"ahrq_plain_language.json[{index}]: expected object")
        context = f"ahrq_plain_language.json[{index}]"
        _require_string(record, "term", context)
        _require_string(record, "replacement", context)
        for alias in term_aliases(record["term"]):
            normalized_alias = normalize(alias)
            key = (record["term"], normalized_alias)
            if key not in seen:
                seen.add(key)
                alias_count += 1
    return len(records), alias_count


def _validate_michigan() -> tuple[int, int]:
    records = _load_json(MICHIGAN_PATH)
    if not isinstance(records, list):
        raise ValueError("michigan_medical_dictionary.json: expected a list")

    alias_count = 0
    seen: set[tuple[str, str]] = set()
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            raise ValueError(f"michigan_medical_dictionary.json[{index}]: expected object")
        context = f"michigan_medical_dictionary.json[{index}]"
        _require_string(record, "term", context)
        _require_string(record, "definition", context)
        for optional_key in ("imgUrl", "altText"):
            if optional_key in record and record[optional_key] is not None:
                _require_string(record, optional_key, context)
        for alias in inflected_aliases(record["term"]):
            normalized_alias = normalize(alias)
            key = (record["term"], normalized_alias)
            if key not in seen:
                seen.add(key)
                alias_count += 1
    return len(records), alias_count


def _validate_abbreviations() -> int:
    abbreviations = _load_json(ABBREVIATIONS_PATH)
    if not isinstance(abbreviations, dict):
        raise ValueError("abbreviations.json: expected an object")

    for abbreviation, expansion in abbreviations.items():
        if not isinstance(abbreviation, str) or not abbreviation.strip():
            raise ValueError("abbreviations.json: expected non-empty string keys")
        if not isinstance(expansion, str) or not expansion.strip():
            raise ValueError(
                f"abbreviations.json[{abbreviation!r}]: expected non-empty string expansion"
            )
    return len(abbreviations)


def validate() -> dict[str, int]:
    _validate_sources()
    ahrq_records, ahrq_aliases = _validate_ahrq()
    michigan_records, michigan_aliases = _validate_michigan()
    abbreviation_records = _validate_abbreviations()

    counts = {
        "ahrq_records": ahrq_records,
        "ahrq_aliases": ahrq_aliases,
        "michigan_records": michigan_records,
        "michigan_aliases": michigan_aliases,
        "abbreviation_records": abbreviation_records,
    }
    logger.info(
        "Validated jargon JSON: %d AHRQ records (%d aliases), "
        "%d Michigan records (%d aliases), %d abbreviations.",
        ahrq_records,
        ahrq_aliases,
        michigan_records,
        michigan_aliases,
        abbreviation_records,
    )
    return counts


def build() -> dict[str, int]:
    """Compatibility wrapper for callers that still invoke build()."""
    return validate()


if __name__ == "__main__":
    build()
    sys.exit(0)
