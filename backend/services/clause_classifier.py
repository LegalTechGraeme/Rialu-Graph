from services.nlp_pipeline import (
    CONDITION_PATTERNS,
    DEFINITION_PATTERNS,
    PAYMENT_PATTERNS,
    TERMINATION_PATTERNS,
    extract_modality,
)


def classify_clause(sentence: str) -> str:
    lower = sentence.lower()

    for pattern in DEFINITION_PATTERNS:
        if pattern.search(sentence):
            return "definition"

    for pattern in TERMINATION_PATTERNS:
        if pattern.search(sentence):
            return "termination"

    for pattern in PAYMENT_PATTERNS:
        if pattern.search(sentence):
            modality = extract_modality(sentence)
            if modality in ("shall", "must", "will"):
                return "payment"
            return "payment"

    for pattern in CONDITION_PATTERNS:
        if pattern.search(sentence):
            return "condition"

    modality = extract_modality(sentence)
    if modality == "may":
        return "permission"
    if modality in ("shall", "must", "will", "should"):
        return "obligation"

    obligation_verbs = [
        "provide", "deliver", "pay", "notify", "maintain", "ensure",
        "comply", "indemnify", "warrant", "perform", "execute",
        "submit", "return", "reimburse", "disclose", "protect",
    ]
    for verb in obligation_verbs:
        if verb in lower:
            return "obligation"

    return "other"
