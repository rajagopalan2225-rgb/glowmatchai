import pandas as pd

# Map detected skin tone label to dataset skin_tone values
TONE_ALIASES = {
    "fair":   ["fair", "light", "pale", "fair-light"],
    "medium": ["medium", "wheatish", "beige", "tan", "olive"],
    "dusky":  ["dusky", "wheatish", "medium", "tan", "dark medium", "caramel", "brown"],
    "dark":   ["dark", "deep", "ebony", "rich"],
}

def normalize_tone(tone: str) -> list[str]:
    """Return list of possible matching terms for a given skin tone label."""
    key = tone.strip().lower()
    return TONE_ALIASES.get(key, [key])


def get_recommendations(df, skin_tone: str, mode: str) -> list[dict]:
    """Filter products by skin tone and mode with alias resolution."""
    if df is None:
        return []

    mode_str = str(mode).strip().lower()
    aliases = normalize_tone(skin_tone)

    # Build a combined mask: row matches any of the tone aliases
    tone_mask = pd.Series([False] * len(df), index=df.index)
    for alias in aliases:
        tone_mask |= df['skin_tone'].str.lower().str.contains(alias, na=False)

    filtered = df[tone_mask]

    # Apply mode filter if column exists
    if 'mode' in filtered.columns and mode_str:
        filtered = filtered[filtered['mode'].str.lower().str.contains(mode_str, na=False)]

    # If nothing found, relax to just the primary label
    if filtered.empty:
        primary = aliases[0]
        filtered = df[df['skin_tone'].str.lower().str.contains(primary, na=False)]

    return filtered.head(12).to_dict(orient="records")


def get_all_modes(df) -> list[str]:
    """Fetch unique modes from dataset."""
    if df is not None and 'mode' in df.columns:
        return sorted(df['mode'].dropna().unique().tolist())
    return ["Daily", "Party", "Office", "Bridal", "Natural"]
