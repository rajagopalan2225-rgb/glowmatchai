import pandas as pd
import numpy as np
import os

def clean_data():
    file_path = "data.csv"
    print("Loading dataset...")
    df = pd.read_csv(file_path)
    initial_rows = len(df)
    
    # 2. STANDARDIZE VALUES
    print("Standardizing values...")
    if 'skin_tone' in df.columns:
        df['skin_tone'] = df['skin_tone'].str.capitalize()
    
    if 'mode' in df.columns:
        df['mode'] = df['mode'].str.lower()
        
    if 'occasion' in df.columns:
        df['occasion'] = df['occasion'].str.lower().replace({
            'casual': 'daily',
            'wedding': 'bridal'
        })
        
    if 'weather_type' in df.columns:
        df['weather_type'] = df['weather_type'].str.lower().replace({
            'rainy': 'humid'
        })

    # 3. RENAME COLUMNS
    print("Renaming columns...")
    df.rename(columns={
        'risk_management': 'risk_level',
        'foundation_shadename': 'foundation',
        'lipstick_shadename': 'lipstick',
        'blush_shadename': 'blush',
        'concealer_shadename': 'concealer'
    }, inplace=True)

    # 4. HANDLE DATA TYPES
    print("Handling data types...")
    # Convert layers to integers (filling NaN first to avoid float cast issues where possible, handled below)

    # 5. CLEAN DATA
    print("Cleaning data...")
    # Fill missings before type casting
    df['foundation_layer'] = df['foundation_layer'].fillna(1).astype(int)
    df['lipstick_layer'] = df['lipstick_layer'].fillna(1).astype(int)
    df['blush_layers'] = df['blush_layers'].fillna(1).astype(int)
    
    if 'foundation_ml' in df.columns:
        df['foundation_ml'] = df['foundation_ml'].fillna(1.0).astype(float)
        
    if 'risk_level' in df.columns:
        df['risk_level'] = df['risk_level'].fillna("low")
        
    if 'cost_of_makeup' in df.columns:
        df['cost_of_makeup'] = df['cost_of_makeup'].fillna(0).astype(int)
        
    if 'longevity' in df.columns:
        # Standardize longevity to "10 hrs"
        df['longevity'] = df['longevity'].astype(str).str.replace('hrs', ' hrs', regex=False).str.replace('  ', ' ')
        
    # Drop rows with missing skin_tone
    df.dropna(subset=['skin_tone'], inplace=True)
    
    # Drop duplicates
    df.drop_duplicates(inplace=True)

    # 6. ADD DERIVED COLUMN
    print("Adding derived column...")
    df['instruction'] = df.apply(
        lambda row: f"Apply {row.get('foundation_layer', 1)} layers (~{row.get('foundation_ml', 1.0)} ml) of {row.get('foundation', 'standard')} foundation, "
                    f"{row.get('lipstick_layer', 1)} layer of {row.get('lipstick', 'standard')}, "
                    f"{row.get('blush_layers', 1)} layers of {row.get('blush', 'standard')} blush.", 
        axis=1
    )

    # 8. BALANCE DATASET (Ensure each skin tone has >= 10 rows)
    print("Balancing dataset...")
    target_min = 10
    synthetic_rows = []
    
    for tone in ['Fair', 'Medium', 'Dark']:
        tone_group = df[df['skin_tone'] == tone]
        count = len(tone_group)
        if count < target_min and count > 0:
            shortage = target_min - count
            # Sample with replacement to create synthetic variations
            samples = tone_group.sample(shortage, replace=True).copy()
            # Slight variations to make them synthetic
            samples['foundation_ml'] = samples['foundation_ml'] + np.round(np.random.uniform(-0.5, 0.5, shortage), 1)
            samples['cost_of_makeup'] = samples['cost_of_makeup'] + np.random.randint(-50, 50, shortage)
            synthetic_rows.append(samples)
        elif count == 0:
            print(f"Warning: No rows for skin tone {tone}. Cannot synthesize from nothing.")
            
    if synthetic_rows:
        df = pd.concat([df] + synthetic_rows, ignore_index=True)

    # 7. SAVE CLEAN DATASET
    print("Saving dataset...")
    temp_path = "data_tmp.csv"
    df.to_csv(temp_path, index=False)
    
    # Try replacing original file
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
        os.rename(temp_path, file_path)
    except Exception as e:
        print(f"Could not replace data.csv directly, error: {e}")
        print("We saved it to data_tmp.csv instead.")
        # But we still output the summary!
    
    final_rows = len(df)
    
    # Generate Summary
    print("\n--- DATA CLEANING SUMMARY ---")
    print(f"Rows Before: {initial_rows}")
    print(f"Rows After: {final_rows}")
    print("\nUnique values per categorical column:")
    cols_to_summarize = ['skin_tone', 'mode', 'occasion', 'weather_type', 'risk_level']
    for col in cols_to_summarize:
        if col in df.columns:
            print(f"{col}: {df[col].unique().tolist()}")
    print("-----------------------------\n")

if __name__ == "__main__":
    clean_data()
