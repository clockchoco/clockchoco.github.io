#!/usr/bin/env python3
"""Validate generated quiz metadata.

The checks here focus on drift between the two question data files and on
metadata mistakes that are easy to miss visually, such as a question whose
era/explanation clearly points at a different item.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_JSON = ROOT / "data" / "questions.json"
QUESTIONS_JS = ROOT / "data" / "questions.js"
EXPLANATIONS_JS = ROOT / "data" / "explanations.js"


def strip_js_line_comments(source: str) -> str:
    out = []
    in_string = False
    escape = False
    quote = ""
    i = 0
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""
        if in_string:
            out.append(ch)
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                in_string = False
            i += 1
            continue
        if ch in ("'", '"'):
            in_string = True
            quote = ch
            out.append(ch)
            i += 1
            continue
        if ch == "/" and nxt == "/":
            while i < len(source) and source[i] not in "\r\n":
                i += 1
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def load_questions_json() -> list[dict]:
    return json.loads(QUESTIONS_JSON.read_text(encoding="utf-8"))


def load_questions_js() -> list[dict]:
    text = QUESTIONS_JS.read_text(encoding="utf-8-sig").strip()
    prefix = "window.QUESTIONS = "
    if not text.startswith(prefix):
        raise ValueError(f"{QUESTIONS_JS} does not start with {prefix!r}")
    payload = text[len(prefix) :].rstrip(";")
    return json.loads(payload)


def load_explanations() -> dict[str, str]:
    text = EXPLANATIONS_JS.read_text(encoding="utf-8-sig").strip()
    prefix = "window.EXPLANATIONS = "
    if not text.startswith(prefix):
        raise ValueError(f"{EXPLANATIONS_JS} does not start with {prefix!r}")
    payload = strip_js_line_comments(text[len(prefix) :]).strip().rstrip(";")
    payload = re.sub(r",\s*}", "}", payload)
    return json.loads(payload)


def signal_warnings(questions: list[dict], explanations: dict[str, str]) -> list[str]:
    warnings = []
    early_terms = (
        "\uace0\uad6c\ub824\uc758 \ub3d9\ub9f9",
        "\uc218\ud608",
        "\ubb34\ucc9c",
        "\uc601\uace0",
        "\uc0ac\ucd9c\ub3c4",
        "\ucc9c\uad70",
        "8\uc870\ubc95",
    )
    modern_terms = (
        "1910\ub144",
        "\ud569\ubcd1 \uc870\uc57d",
        "\ub300\uc77c \uc120\uc804",
        "\uc784\uc2dc \uc815\ubd80",
        "\uc870\uc120 \ucd1d\ub3c5\ubd80",
    )
    for q in questions:
        era = str(q.get("era", ""))
        snippet = str(q.get("textSnippet", ""))
        explanation = explanations.get(q.get("id"), "")
        if "\uc77c\uc81c\uac15\uc810\uae30" in era and any(term in explanation for term in early_terms):
            warnings.append(f"{q['id']}: era is modern, but explanation has early-state signal")
        if "\uc120\uc0ac\u00b7\ucd08\uae30 \uad6d\uac00" in era and any(term in snippet for term in modern_terms):
            warnings.append(f"{q['id']}: era is early-state, but snippet has modern signal")
        if explanation and "\uac15\uac00\ub098 \ud574\uc548\uac00\uc758 \uc6c0\uc9d1" in explanation:
            if "\uc120\uc0ac\u00b7\ucd08\uae30 \uad6d\uac00" not in era:
                warnings.append(f"{q['id']}: neolithic explanation outside early-state era")
    return warnings


def validate() -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    questions_json = load_questions_json()
    questions_js = load_questions_js()
    explanations = load_explanations()

    if questions_json != questions_js:
        errors.append("data/questions.json and data/questions.js are out of sync")

    questions = questions_js
    ids = [q.get("id") for q in questions]
    duplicates = sorted({qid for qid in ids if ids.count(qid) > 1})
    if duplicates:
        errors.append(f"duplicate ids: {', '.join(duplicates[:20])}")

    by_round: dict[tuple[int, str], list[int]] = {}
    for q in questions:
        qid = q.get("id")
        round_no = q.get("round")
        level = q.get("level")
        number = q.get("question")
        by_round.setdefault((round_no, level), []).append(number)

        if not isinstance(qid, str) or not re.fullmatch(r"\d+(H|S)-\d{2}", qid):
            errors.append(f"{qid}: malformed id")
        if q.get("answer") not in (1, 2, 3, 4, 5):
            errors.append(f"{qid}: invalid answer {q.get('answer')!r}")
        if not isinstance(q.get("points"), int) or q["points"] <= 0:
            errors.append(f"{qid}: invalid points {q.get('points')!r}")
        if not (ROOT / q.get("image", "")).exists():
            errors.append(f"{qid}: missing image {q.get('image')!r}")

        crop = q.get("crop")
        if not (isinstance(crop, list) and len(crop) == 4 and all(isinstance(v, int) for v in crop)):
            errors.append(f"{qid}: invalid crop {crop!r}")
        else:
            x, y, w, h = crop
            if x < 0 or y < 0 or w <= 0 or h <= 0:
                errors.append(f"{qid}: non-positive crop {crop!r}")
            if x + w > q.get("pageW", 0) + 2 or y + h > q.get("pageH", 0) + 2:
                errors.append(f"{qid}: crop exceeds page bounds {crop!r}")

        snippet = str(q.get("textSnippet", "")).strip()
        if snippet and not snippet.startswith(f"{number}."):
            warnings.append(f"{qid}: textSnippet does not start with question number")

    for (round_no, level), numbers in sorted(by_round.items()):
        expected = list(range(1, 51))
        if sorted(numbers) != expected:
            errors.append(f"round {round_no} {level}: question numbers are not 1..50")

    warnings.extend(signal_warnings(questions, explanations))
    return errors, warnings


def main() -> int:
    errors, warnings = validate()
    for item in errors:
        print(f"ERROR: {item}")
    for item in warnings:
        print(f"WARN: {item}")
    print(f"Validation complete: {len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
