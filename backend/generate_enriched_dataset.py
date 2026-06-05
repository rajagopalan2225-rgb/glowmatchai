"""
generate_enriched_dataset.py
────────────────────────────
Generates a balanced, diverse makeup recommendation dataset covering
Fair, Medium, Dusky and Dark skin tones with unique product shades,
modes, occasions, and weather conditions — no repetitive recommendations.
Run once: python generate_enriched_dataset.py
"""

import pandas as pd
import numpy as np
import random
import os

random.seed(42)
np.random.seed(42)

# ─────────────────────────────────────────────
# PRODUCT PALETTE — unique per skin tone
# ─────────────────────────────────────────────

PALETTE = {
    "Fair": {
        "foundation":   ["porcelain", "ivory", "matte_ivory", "light_beige", "shell", "snow_beige",
                          "alabaster", "linen", "nude_ivory", "soft_porcelain"],
        "lipstick":     ["peach", "rose", "bold_rose", "blush_pink", "mauve", "dusty_rose",
                          "coral_pink", "soft_berry", "baby_pink", "lilac_nude"],
        "blush":        ["peach_blush", "rose_blush", "baby_pink_blush", "luminous_pink",
                          "soft_coral_blush", "cherry_blush"],
        "mascara":      ["brown", "black", "dark_brown", "espresso_black"],
        "concealer":    ["fair_concealer", "ivory_concealer", "light_peach_concealer",
                          "porcelain_concealer", "shell_concealer"],
    },
    "Medium": {
        "foundation":   ["sand", "beige", "warm_beige", "matte_sand", "matte_beige",
                          "matte_warm_beige", "golden_beige", "honey_beige", "natural_beige",
                          "satin_sand", "toasted_almond", "champagne_beige"],
        "lipstick":     ["nude", "coral", "red", "bold_red", "bold_nude", "bold_coral",
                          "terracotta", "brick_red", "rose_nude", "warm_coral", "peach_nude",
                          "burnt_sienna", "dusty_coral"],
        "blush":        ["soft_blush", "peach_blush", "warm_rose_blush", "coral_blush",
                          "golden_blush", "terra_blush", "apricot_blush"],
        "mascara":      ["black", "brown_black", "dark_espresso"],
        "concealer":    ["natural_concealer", "medium_beige_concealer", "warm_concealer",
                          "golden_concealer", "sand_concealer"],
    },
    "Dusky": {
        "foundation":   ["tan_beige", "warm_tan", "golden_tan", "caramel_beige",
                          "matte_tan", "satin_tan", "bronze_beige", "deep_sand",
                          "toasted_caramel", "sun_kissed_tan", "warm_copper",
                          "amber_beige", "desert_sand", "spice_beige", "chai_latte"],
        "lipstick":     ["terracotta", "burnt_orange", "warm_nude", "deep_coral",
                          "brick_red", "mauve_rose", "dusty_mauve", "cinnamon",
                          "warm_berry", "sienna", "rust_red", "deep_peach",
                          "fig", "copper_nude", "earth_red"],
        "blush":        ["terracotta_blush", "bronze_blush", "warm_peach_blush",
                          "amber_blush", "copper_blush", "sunset_blush",
                          "golden_coral_blush", "dusty_rose_blush"],
        "mascara":      ["black", "dark_brown", "espresso_black", "brown_black"],
        "concealer":    ["tan_concealer", "warm_tan_concealer", "golden_concealer",
                          "caramel_concealer", "amber_concealer", "copper_concealer"],
    },
    "Dark": {
        "foundation":   ["mocha", "espresso", "caramel", "matte_mocha", "matte_espresso",
                          "matte_caramel", "deep_mahogany", "ebony", "rich_chocolate",
                          "dark_walnut", "deep_cocoa", "sable", "midnight_mocha",
                          "truffle", "deep_espresso"],
        "lipstick":     ["wine", "plum", "dark_red", "bold_wine", "deep_berry",
                          "midnight_plum", "oxblood", "dark_mauve", "blackcurrant",
                          "burgundy", "deep_fuchsia", "dark_brick",
                          "mulberry", "raisin", "deep_chocolate_nude"],
        "blush":        ["deep_rose_blush", "plum_blush", "berry_blush", "dark_coral_blush",
                          "wine_blush", "mauve_blush", "merlot_blush", "brick_blush"],
        "mascara":      ["black", "deep_black", "carbon_black", "jet_black"],
        "concealer":    ["rich_concealer", "dark_concealer", "espresso_concealer",
                          "deep_tone_concealer", "mahogany_concealer", "mocha_concealer"],
    },
}

MODES      = ["simple", "occasion", "weather"]
OCCASIONS  = ["normal", "office", "bridal", "party", "daily"]
WEATHERS   = ["normal", "hot", "cold", "humid"]
RISK       = ["low", "medium", "high"]
LONGEVITY  = ["6 hrs", "8 hrs", "10 hrs", "12 hrs", "14 hrs"]

# Per-tone targets — balance the dataset
TARGETS = {
    "Fair":   200,
    "Medium": 400,
    "Dusky":  400,
    "Dark":   400,
}

def rand_layers(lo=1, hi=3): return random.randint(lo, hi)
def rand_ml():                return round(random.uniform(1.5, 5.5), 1)
def rand_cost():              return random.randint(500, 3200)

def pick_unique(options, used_set, fallback_ok=False):
    """Try to pick an option not recently used; fallback if exhausted."""
    remaining = [o for o in options if o not in used_set]
    if not remaining:
        if fallback_ok:
            return random.choice(options)
        used_set.clear()
        return random.choice(options)
    chosen = random.choice(remaining)
    used_set.add(chosen)
    return chosen

def build_rows(tone, count):
    rows = []
    p = PALETTE[tone]
    recent_foundations  = set()
    recent_lipsticks    = set()
    recent_blushes      = set()
    recent_mascaras     = set()
    recent_concealers   = set()

    for i in range(count):
        mode     = random.choice(MODES)
        occasion = random.choice(OCCASIONS)
        weather  = random.choice(WEATHERS)

        # Align occasion & weather with mode logically
        if mode == "occasion":
            occasion = random.choice(["office", "bridal", "party", "daily", "normal"])
        elif mode == "weather":
            weather  = random.choice(["hot", "cold", "humid", "normal"])

        f_layer = rand_layers(1, 3)
        f_ml    = rand_ml()

        # Weather-aware adjustments
        if weather == "hot":
            f_layer = 1
            f_ml    = round(random.uniform(1.5, 3.0), 1)
        elif weather == "cold":
            f_layer = random.randint(2, 3)
            f_ml    = round(random.uniform(3.0, 5.5), 1)

        # Mode-aware longevity & risk
        if mode == "simple":
            longevity = random.choice(["6 hrs", "8 hrs"])
            risk      = "low"
        elif mode == "occasion":
            longevity = random.choice(["10 hrs", "12 hrs", "14 hrs"])
            risk      = random.choice(["medium", "high"])
        else:  # weather
            longevity = random.choice(["8 hrs", "10 hrs", "12 hrs"])
            risk      = random.choice(RISK)

        foundation = pick_unique(p["foundation"], recent_foundations, fallback_ok=True)
        lipstick   = pick_unique(p["lipstick"],   recent_lipsticks,   fallback_ok=True)
        blush      = pick_unique(p["blush"],       recent_blushes,     fallback_ok=True)
        mascara    = pick_unique(p["mascara"],     recent_mascaras,    fallback_ok=True)
        concealer  = pick_unique(p["concealer"],   recent_concealers,  fallback_ok=True)

        instruction = (
            f"Apply {f_layer} layer{'s' if f_layer>1 else ''} (~{f_ml} ml) of "
            f"{foundation} foundation, {rand_layers(1,2)} layer of {lipstick} lipstick, "
            f"{rand_layers(1,2)} layer{'s' if rand_layers(1,2)>1 else ''} of {blush} blush."
        )

        rows.append({
            "image_path":       f"images/gen_{tone.lower()}_{i:04d}.jpg",
            "skin_tone":        tone,
            "foundation":       foundation,
            "foundation_layer": f_layer,
            "foundation_ml":    f_ml,
            "lipstick":         lipstick,
            "lipstick_layer":   rand_layers(1, 2),
            "blush":            blush,
            "blush_layers":     rand_layers(1, 2),
            "mascara_shade":    mascara,
            "mascara_layer":    rand_layers(1, 3),
            "concealer":        concealer,
            "concealer_layer":  rand_layers(1, 2),
            "longevity":        longevity,
            "risk_level":       risk,
            "cost_of_makeup":   rand_cost(),
            "mode":             mode,
            "occasion":         occasion,
            "weather_type":     weather,
            "instruction":      instruction,
            "luminance_bucket": i % 10,  # 0-9 variety bucket for unique selection
        })
    return rows

# ─────────────────────────────────────────────
# BUILD & MERGE
# ─────────────────────────────────────────────

all_rows = []
for tone, count in TARGETS.items():
    print(f"Generating {count} rows for {tone}...")
    all_rows.extend(build_rows(tone, count))

new_df = pd.DataFrame(all_rows)

# Load existing cleaned data and merge (keep original rows too)
existing_path = os.path.join(os.path.dirname(__file__), "cleaned_data.csv")
if os.path.exists(existing_path):
    existing = pd.read_csv(existing_path)
    # Normalise skin_tone in existing — add Dusky rows from Dark where appropriate
    # Keep all existing rows but tag them
    if "luminance_bucket" not in existing.columns:
        existing["luminance_bucket"] = 0
    merged = pd.concat([existing, new_df], ignore_index=True)
else:
    merged = new_df

# Ensure consistent types
merged["foundation_layer"] = merged["foundation_layer"].fillna(1).astype(int)
merged["lipstick_layer"]   = merged["lipstick_layer"].fillna(1).astype(int)
merged["blush_layers"]     = merged["blush_layers"].fillna(1).astype(int)
merged["mascara_layer"]    = merged["mascara_layer"].fillna(1).astype(int)
merged["concealer_layer"]  = merged["concealer_layer"].fillna(1).astype(int)
merged["cost_of_makeup"]   = merged["cost_of_makeup"].fillna(1500).astype(int)
merged["foundation_ml"]    = merged["foundation_ml"].fillna(2.0).astype(float)

# Drop exact duplicates
merged.drop_duplicates(inplace=True)

# Save
out_path = os.path.join(os.path.dirname(__file__), "cleaned_data.csv")
merged.to_csv(out_path, index=False)

print(f"\n✅ Dataset saved → {out_path}")
print(f"Total rows: {len(merged)}")
print("\n📊 Skin Tone Distribution:")
print(merged["skin_tone"].value_counts())
print("\n🎨 Dusky Foundation Shades:")
print(merged[merged["skin_tone"]=="Dusky"]["foundation"].value_counts().head(15))
print("\n💄 Dusky Lipstick Shades:")
print(merged[merged["skin_tone"]=="Dusky"]["lipstick"].value_counts().head(15))
print("\n🌙 Dark Foundation Shades:")
print(merged[merged["skin_tone"]=="Dark"]["foundation"].value_counts().head(15))
