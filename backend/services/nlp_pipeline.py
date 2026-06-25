import re
from typing import Optional

import spacy

_nlp = None


def get_nlp():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            from spacy.cli import download
            download("en_core_web_sm")
            _nlp = spacy.load("en_core_web_sm")
    return _nlp


MODALITY_PATTERNS = {
    "shall": re.compile(r"\bshall\b", re.I),
    "must": re.compile(r"\bmust\b", re.I),
    "may": re.compile(r"\bmay\b", re.I),
    "will": re.compile(r"\bwill\b", re.I),
    "should": re.compile(r"\bshould\b", re.I),
}

TIME_PATTERNS = [
    re.compile(r"within\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)", re.I),
    re.compile(r"(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+(of|after|from|following)", re.I),
    re.compile(r"no\s+later\s+than\s+(\d+)\s+(day|days|week|weeks|month|months)", re.I),
    re.compile(r"on\s+or\s+before\s+.+", re.I),
]

CONDITION_PATTERNS = [
    re.compile(r"\bif\b", re.I),
    re.compile(r"\bprovided\s+that\b", re.I),
    re.compile(r"\bsubject\s+to\b", re.I),
    re.compile(r"\bunless\b", re.I),
    re.compile(r"\bin\s+the\s+event\s+that\b", re.I),
    re.compile(r"\bwhere\b", re.I),
]

PARTY_PATTERNS = [
    re.compile(r"\b(the\s+)?(supplier|buyer|tenant|landlord|licensor|licensee|company|contractor|client|vendor|purchaser|seller|borrower|lender|employer|employee|party\s+[a-z])\b", re.I),
]

PAYMENT_PATTERNS = [
    re.compile(r"\bpayment\b", re.I),
    re.compile(r"\binvoice\b", re.I),
    re.compile(r"\bfee\b", re.I),
    re.compile(r"\bcompensation\b", re.I),
    re.compile(r"\bprice\b", re.I),
    re.compile(r"\bremuneration\b", re.I),
]

TERMINATION_PATTERNS = [
    re.compile(r"\bterminat", re.I),
    re.compile(r"\bexpir", re.I),
    re.compile(r"\bcancel", re.I),
    re.compile(r"\bnotice\s+period\b", re.I),
]

DEFINITION_PATTERNS = [
    re.compile(r"\bmeans\b", re.I),
    re.compile(r"\bshall\s+mean\b", re.I),
    re.compile(r"\brefers\s+to\b", re.I),
    re.compile(r"\bdefined\s+as\b", re.I),
    re.compile(r'"[^"]+"\s+(means|shall mean)', re.I),
]


def split_sentences(text: str) -> list[str]:
    nlp = get_nlp()
    doc = nlp(text)
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
    if not sentences:
        sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    return sentences


def extract_modality(sentence: str) -> Optional[str]:
    for modality, pattern in MODALITY_PATTERNS.items():
        if pattern.search(sentence):
            return modality
    return None


def extract_time_constraint(sentence: str) -> Optional[str]:
    for pattern in TIME_PATTERNS:
        match = pattern.search(sentence)
        if match:
            return match.group(0)
    return None


def extract_conditions(sentence: str) -> list[str]:
    conditions = []
    for pattern in CONDITION_PATTERNS:
        if pattern.search(sentence):
            match = pattern.search(sentence)
            if match:
                start = match.start()
                conditions.append(sentence[start:].strip())
                break
    return conditions


def _clean_actor(actor: Optional[str]) -> Optional[str]:
    if not actor:
        return None
    actor = actor.strip()
    noise_patterns = [
        re.compile(r"^\d+\s*\.?\s*", re.I),
        re.compile(r"\b(OBLIGATIONS|CONDITIONS|TERMINATION|WARRANTIES|INSURANCE|PAYMENT|FEES|RENT)\b", re.I),
        re.compile(r"^(TERM AND|GRANT OF|PARTIES AND)", re.I),
    ]
    for p in noise_patterns:
        if p.search(actor):
            return None
    if len(actor) > 60:
        return None
    return actor


def extract_actor_action_object(sentence: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    nlp = get_nlp()
    doc = nlp(sentence)

    actor = None
    action = None
    obj = None

    for token in doc:
        if token.dep_ in ("nsubj", "nsubjpass", "agent") and not actor:
            actor_span = " ".join(t.text for t in token.subtree)
            actor = actor_span.strip()

        if token.pos_ == "VERB" and token.dep_ in ("ROOT", "ccomp", "xcomp") and not action:
            action = token.lemma_.lower()

        if token.dep_ in ("dobj", "pobj", "attr", "oprd") and not obj:
            obj_span = " ".join(t.text for t in token.subtree)
            obj = obj_span.strip()

    if not actor:
        for pattern in PARTY_PATTERNS:
            match = pattern.search(sentence)
            if match:
                actor = match.group(0).strip()
                break

    actor = _clean_actor(actor)

    if not action:
        for token in doc:
            if token.pos_ == "VERB":
                action = token.lemma_.lower()
                break

    return actor, action, obj


def extract_parties(text: str) -> list[tuple[str, str]]:
    parties = []
    seen = set()
    for pattern in PARTY_PATTERNS:
        for match in pattern.finditer(text):
            name = match.group(0).strip()
            key = name.lower()
            if key not in seen:
                seen.add(key)
                parties.append((name, "party"))
    return parties
