"""
jargon_db.py - JSON-backed helpers for deterministic jargon term detection.

The source data is small enough to load directly from data/jargon/*.json at
runtime. This module keeps the public lookup helpers used by term_detection,
but no longer opens or queries a generated database.
"""

from functools import lru_cache
import json
import logging
import os
import re

from utils.text_normalization import (
    contains_normalized_term,
    inflected_aliases,
    normalize,
    term_aliases,
)

logger = logging.getLogger(__name__)

_DATA_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "data", "jargon")
)
_SOURCES_PATH = os.path.join(_DATA_DIR, "sources.json")
_AHRQ_PATH = os.path.join(_DATA_DIR, "ahrq_plain_language.json")
_MICHIGAN_PATH = os.path.join(_DATA_DIR, "michigan_medical_dictionary.json")
_ABBREVIATIONS_PATH = os.path.join(_DATA_DIR, "abbreviations.json")


def _load_json(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def _sources() -> dict:
    return _load_json(_SOURCES_PATH)


def _source_name(source_key: str, fallback: str) -> str:
    return _sources().get(source_key, {}).get("name", fallback)


def _abbreviation_pattern(normalized_abbreviation: str) -> str:
    if normalized_abbreviation.isalpha():
        dotted = r"\.?".join(re.escape(char) for char in normalized_abbreviation)
        return rf"(?<!\w){dotted}\.?(?!\w)"
    return rf"(?<!\w){re.escape(normalized_abbreviation)}(?!\w)"


def _is_exact_term_alias(term: str, normalized_lookup_term: str) -> bool:
    return normalized_lookup_term in {normalize(alias) for alias in term_aliases(term)}


@lru_cache(maxsize=1)
def _plain_language_rows() -> tuple[dict, ...]:
    records = _load_json(_AHRQ_PATH)
    source = _source_name(
        "ahrq_plain_language",
        "AHRQ Health Literacy Universal Precautions Toolkit plain-language words",
    )
    rows: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for record in records:
        term = record["term"]
        for alias in term_aliases(term):
            normalized_alias = normalize(alias)
            key = (term, normalized_alias)
            if key in seen:
                continue
            seen.add(key)
            rows.append(
                {
                    "term": term,
                    "normalized_term": normalized_alias,
                    "replacement": record["replacement"],
                    "source": source,
                    "notes": record.get("notes", ""),
                }
            )

    rows.sort(
        key=lambda row: (
            -len(row["normalized_term"]),
            not _is_exact_term_alias(row["term"], row["normalized_term"]),
            row["term"],
        )
    )
    logger.info("jargon_db: loaded %d AHRQ lookup aliases from JSON", len(rows))
    return tuple(rows)


@lru_cache(maxsize=1)
def _medical_rows() -> tuple[dict, ...]:
    records = _load_json(_MICHIGAN_PATH)
    source = _source_name(
        "michigan_medical_dictionary",
        "University of Michigan Plain Language Medical Dictionary",
    )
    rows: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for record in records:
        term = record["term"]
        for alias in inflected_aliases(term):
            normalized_alias = normalize(alias)
            key = (term, normalized_alias)
            if key in seen:
                continue
            seen.add(key)
            rows.append(
                {
                    "term": term,
                    "normalized_term": normalized_alias,
                    "matched_term": alias,
                    "definition": record["definition"],
                    "source": source,
                    "imgUrl": record.get("imgUrl"),
                    "altText": record.get("altText"),
                }
            )

    rows.sort(
        key=lambda row: (
            -len(row["normalized_term"]),
            not _is_exact_term_alias(row["term"], row["normalized_term"]),
            row["term"],
        )
    )
    logger.info("jargon_db: loaded %d Michigan lookup aliases from JSON", len(rows))
    return tuple(rows)


@lru_cache(maxsize=1)
def _abbreviation_rows() -> tuple[dict, ...]:
    abbreviation_map = _load_json(_ABBREVIATIONS_PATH)
    source = _source_name("local_abbreviations", "Local medical abbreviation expansions")
    rows = [
        {
            "abbreviation": abbreviation,
            "normalized_abbreviation": normalize(abbreviation),
            "expansion": expansion,
            "source": source,
        }
        for abbreviation, expansion in abbreviation_map.items()
    ]
    rows.sort(key=lambda row: len(row["abbreviation"]), reverse=True)
    logger.info("jargon_db: loaded %d abbreviation aliases from JSON", len(rows))
    return tuple(rows)


def lookup_plain_language_terms(normalized_text: str) -> list[dict]:
    """
    Return AHRQ plain-language terms found in text.
    Each hit: {term, replacement, source, action, notes}.
    """
    hits: list[dict] = []
    seen: set[str] = set()
    seen_terms: set[str] = set()
    for row in _plain_language_rows():
        n = row["normalized_term"]
        if n in seen or row["term"] in seen_terms:
            continue
        if contains_normalized_term(normalized_text, n):
            seen.add(n)
            seen_terms.add(row["term"])
            hits.append({
                "term": row["term"],
                "replacement": row["replacement"],
                "source": row["source"],
                "action": "replace_if_context_fits",
                "notes": row["notes"] or "",
            })
    return hits


def lookup_medical_terms(normalized_text: str) -> list[dict]:
    """
    Return Michigan medical dictionary terms found in text.
    Each hit: {term, definition, source, action}.
    Matches longer phrases first to avoid sub-term collisions.
    """
    hits: list[dict] = []
    seen: set[str] = set()
    seen_terms: set[str] = set()
    for row in _medical_rows():
        n = row["normalized_term"]
        if n in seen or row["term"] in seen_terms:
            continue
        if contains_normalized_term(normalized_text, n):
            # Skip sub-terms already covered by a longer match.
            already_covered = any(n in s for s in seen)
            if already_covered:
                continue
            seen.add(n)
            seen_terms.add(row["term"])
            hits.append({
                "term": row["term"],
                "matched_term": row["matched_term"],
                "definition": row["definition"],
                "source": row["source"],
                "imgUrl": row["imgUrl"],
                "altText": row["altText"],
                "action": "preserve_define",
            })
    return hits


def lookup_abbreviations(normalized_text: str) -> list[dict]:
    """
    Return abbreviation expansions found in text.
    Each hit: {term, expansion, source}.
    """
    hits: list[dict] = []
    seen: set[str] = set()
    for row in _abbreviation_rows():
        n = row["normalized_abbreviation"]
        if n in seen:
            continue
        pattern = r"\b" + re.escape(n) + r"\b"
        if re.search(pattern, normalized_text) or re.search(
            _abbreviation_pattern(n),
            normalized_text,
        ):
            seen.add(n)
            hits.append({
                "term": row["abbreviation"],
                "expansion": row["expansion"],
                "source": row["source"],
            })
    return hits


def build_terms_glossary(medical_term_hits: list[dict]) -> dict[str, dict]:
    """
    Build the compact terms glossary dict for the final JSON output.
    Keys are the original term strings (title-cased as found).
    Values: {definition, source}.
    """
    glossary: dict[str, dict] = {}
    for hit in medical_term_hits:
        glossary[hit["term"]] = {
            "definition": hit["definition"],
            "source": hit["source"],
            "imgUrl": hit.get("imgUrl"),
            "altText": hit.get("altText"),
        }
    return glossary
