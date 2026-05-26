"""
jargon_db.py - Read-only SQLite helpers for the jargon term database.

The DB is built at deploy/build time by scripts/build_jargon_db.py.
At runtime this module opens a single read-only connection per process.
"""

import json
import logging
import os
import sqlite3
import unicodedata

logger = logging.getLogger(__name__)

_DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "..", "data", "jargon", "jargon.sqlite",
)
_conn: sqlite3.Connection | None = None


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        db_path = os.path.abspath(_DB_PATH)
        if not os.path.exists(db_path):
            raise RuntimeError(
                f"Jargon SQLite DB not found at {db_path}. "
                "Run scripts/build_jargon_db.py first."
            )
        _conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        logger.info("jargon_db: opened read-only connection to %s", db_path)
    return _conn


def normalize(text: str) -> str:
    """Lowercase, strip accents, collapse whitespace."""
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = nfkd.encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_text.lower().split())


def lookup_plain_language_terms(text: str) -> list[dict]:
    """
    Return AHRQ plain-language terms found in text.
    Each hit: {term, replacement, source, action, notes}.
    """
    conn = _get_conn()
    normalized_text = normalize(text)
    rows = conn.execute(
        "SELECT term, normalized_term, replacements_json, source, notes "
        "FROM plain_language_terms ORDER BY LENGTH(term) DESC"
    ).fetchall()

    hits: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        n = row["normalized_term"]
        if n in seen:
            continue
        if n in normalized_text:
            seen.add(n)
            replacements = json.loads(row["replacements_json"] or "[]")
            hits.append({
                "term": row["term"],
                "replacement": replacements[0] if replacements else row["term"],
                "source": row["source"],
                "action": "replace_if_context_fits",
                "notes": row["notes"] or "",
            })
    return hits


def lookup_medical_terms(text: str) -> list[dict]:
    """
    Return Michigan medical dictionary terms found in text.
    Each hit: {term, definition, source, action}.
    Matches longer phrases first to avoid sub-term collisions.
    """
    conn = _get_conn()
    normalized_text = normalize(text)
    rows = conn.execute(
        "SELECT term, normalized_term, definition, source "
        "FROM medical_terms ORDER BY LENGTH(term) DESC"
    ).fetchall()

    hits: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        n = row["normalized_term"]
        if n in seen:
            continue
        if n in normalized_text:
            # Skip sub-terms already covered by a longer match.
            already_covered = any(n in s for s in seen)
            if already_covered:
                continue
            seen.add(n)
            hits.append({
                "term": row["term"],
                "definition": row["definition"],
                "source": row["source"],
                "action": "preserve_define",
            })
    return hits


def lookup_abbreviations(text: str) -> list[dict]:
    """
    Return abbreviation expansions found in text.
    Each hit: {term, expansion, source}.
    """
    conn = _get_conn()
    normalized_text = normalize(text)
    rows = conn.execute(
        "SELECT abbreviation, normalized_abbreviation, expansion, source "
        "FROM abbreviation_terms ORDER BY LENGTH(abbreviation) DESC"
    ).fetchall()

    hits: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        n = row["normalized_abbreviation"]
        if n in seen:
            continue
        # Word-boundary check: must appear as whole word in normalized text.
        import re
        pattern = r"\b" + re.escape(n) + r"\b"
        if re.search(pattern, normalized_text):
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
        }
    return glossary
