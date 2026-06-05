"""
dataset_handler.py — NO-DATABASE MODE
Uses the pandas DataFrame (loaded from CSV at startup) instead of PostgreSQL.
"""
import hashlib
import random

# ── Tone normalisation ────────────────────────────────────────────────────────
TONE_MAP = {
    "fair":      ["Fair"],
    "medium":    ["Medium"],
    "dusky":     ["Dusky"],
    "dark":      ["Dark"],
    "light":     ["Fair"],
    "pale":      ["Fair"],
    "wheatish":  ["Medium", "Dusky"],
    "tan":       ["Dusky"],
    "olive":     ["Medium", "Dusky"],
    "brown":     ["Dusky", "Dark"],
    "caramel":   ["Dusky", "Dark"],
    "deep":      ["Dark"],
    "ebony":     ["Dark"],
}

def normalize_tone(tone: str) -> list:
    key = tone.strip().lower()
    return TONE_MAP.get(key, [tone.capitalize()])


def _filter_df(df, skin_tone: str, mode: str = None):
    """Filter the dataframe by skin tone and optionally mode."""
    if df is None:
        return []
    tones = normalize_tone(skin_tone)
    # Case-insensitive tone filter
    mask = df["skin_tone"].str.strip().str.lower().isin([t.lower() for t in tones])
    filtered = df[mask]
    if mode and not filtered.empty:
        mode_mask = filtered["mode"].str.strip().str.lower() == mode.strip().lower()
        mode_filtered = filtered[mode_mask]
        if not mode_filtered.empty:
            filtered = mode_filtered
    return filtered.to_dict(orient="records") if not filtered.empty else []


def get_recommendations(df, skin_tone: str, mode: str, seed: str = "default") -> list:
    """Return up to 12 varied product recommendations from the CSV dataframe."""
    rows = _filter_df(df, skin_tone, mode)
    if not rows:
        rows = _filter_df(df, skin_tone)
    if not rows:
        return []
    h = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    random.seed(h)
    shuffled = rows[:]
    random.shuffle(shuffled)
    return shuffled[:12]


def get_best_match_row(df, skin_tone: str, mode: str, seed: str = "default"):
    """Return the single best matching row from the CSV dataframe."""
    rows = _filter_df(df, skin_tone, mode)
    if not rows:
        rows = _filter_df(df, skin_tone)
    if not rows:
        return None
    h = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    return rows[h % len(rows)]


def get_all_modes(df) -> list:
    """Return distinct modes available in the dataframe."""
    if df is None or df.empty:
        return ["simple", "occasion", "weather"]
    try:
        modes = df["mode"].dropna().str.strip().str.lower().unique().tolist()
        return sorted(modes) if modes else ["simple", "occasion", "weather"]
    except Exception:
        return ["simple", "occasion", "weather"]
