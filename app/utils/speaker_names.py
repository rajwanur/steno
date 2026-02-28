"""Utility functions for speaker name transformations."""

import re
from typing import Any, Dict, List


# Pattern to match typical diarization speaker labels like SPEAKER_00, SPEAKER_01, etc.
_SPEAKER_ID_PATTERN = re.compile(r"^SPEAKER_\d{2}$", re.IGNORECASE)


def _normalize_overrides(overrides: Dict[str, str]) -> Dict[str, str]:
    """
    Normalize speaker name overrides to ensure raw speaker IDs map to custom names.

    If the overrides appear to be in "custom_name -> speaker_id" format, reverse them.
    Detection heuristic: if keys match SPEAKER_XX pattern, assume correct format.
    Otherwise, assume reverse format and flip the mapping.

    Args:
        overrides: User-provided mapping (either format).

    Returns:
        Normalized mapping from raw speaker IDs to custom names.
    """
    if not overrides:
        return {}

    # Check if any key looks like a speaker ID (SPEAKER_00, SPEAKER_01, etc.)
    has_speaker_id_keys = any(
        _SPEAKER_ID_PATTERN.match(str(k).strip()) for k in overrides.keys()
    )

    if has_speaker_id_keys:
        # Already in correct format: raw_speaker_id -> custom_name
        return {str(k).strip(): str(v).strip() for k, v in overrides.items() if k and v}

    # Assume reverse format: custom_name -> raw_speaker_id, so flip it
    return {str(v).strip(): str(k).strip() for k, v in overrides.items() if k and v}


def apply_speaker_name_overrides(
    segments: List[Dict[str, Any]], overrides: Dict[str, str]
) -> List[Dict[str, Any]]:
    """
    Return a copy of segments with speaker names replaced by custom overrides.

    Args:
        segments: List of segment dicts with 'speaker' and 'text' keys.
        overrides: Mapping from raw speaker names to custom names, or vice versa.
            Auto-detects format and normalizes accordingly.

    Returns:
        New list of segments with speaker names replaced where overrides exist.
    """
    if not overrides:
        return segments

    normalized = _normalize_overrides(overrides)
    if not normalized:
        return segments

    result = []
    for seg in segments:
        seg_copy = dict(seg)
        raw_speaker = seg_copy.get("speaker", "")
        if isinstance(raw_speaker, str) and raw_speaker.strip():
            custom_name = normalized.get(raw_speaker.strip())
            if custom_name and isinstance(custom_name, str) and custom_name.strip():
                seg_copy["speaker"] = custom_name.strip()
        result.append(seg_copy)
    return result


def build_transcript_with_custom_speakers(
    segments: List[Dict[str, Any]], overrides: Dict[str, str]
) -> str:
    """
    Build a transcript string with speaker names for AI summary.
    Uses custom names if overrides are provided, otherwise uses raw speaker IDs.

    Args:
        segments: List of segment dicts with 'speaker' and 'text' keys.
        overrides: Mapping from raw speaker names to custom names, or vice versa.
            Auto-detects format and normalizes accordingly.

    Returns:
        Formatted transcript string with speaker names (custom or raw).
    """
    if not segments:
        return ""

    normalized = _normalize_overrides(overrides)

    lines = []
    for seg in segments:
        raw_speaker = seg.get("speaker", "")
        text = seg.get("text", "").strip()

        if not text:
            continue

        if isinstance(raw_speaker, str) and raw_speaker.strip():
            # Use custom name if available, otherwise use raw speaker ID
            speaker_name = normalized.get(raw_speaker.strip(), raw_speaker.strip())
            lines.append(f"{speaker_name}: {text}")
        else:
            # No speaker label, just output the text
            lines.append(text)

    return "\n".join(lines)