import os
import pandas as pd
from database import SessionLocal, engine, Base
import models

# Ensure tables are created
models.Base.metadata.create_all(bind=engine)

def seed_database():
    csv_file = "cleaned_data.csv"
    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found.")
        return

    print("Loading CSV...")
    df = pd.read_csv(csv_file)
    db = SessionLocal()

    try:
        # Avoid duplicate seeding
        existing = db.query(models.MakeupProduct).first()
        if existing:
            print("Database already contains product data! Skipping seed to avoid duplicates.")
            return

        print(f"Seeding {len(df)} products into PostgreSQL Database...")
        products = []
        for _, row in df.iterrows():
            product = models.MakeupProduct(
                skin_tone=str(row.get("skin_tone", "")),
                mode=str(row.get("mode", "")),
                foundation=str(row.get("foundation", "")),
                lipstick=str(row.get("lipstick", "")),
                blush=str(row.get("blush", "")),
                eyeshadow=str(row.get("eyeshadow", "")),
                eyeliner=str(row.get("eyeliner", "")),
                mascara_shade=str(row.get("mascara_shade", "")),
                concealer=str(row.get("concealer", "")),
                highlighter=str(row.get("highlighter", "")),
                foundation_layer=int(row.get("foundation_layer", 1)),
                lipstick_layer=int(row.get("lipstick_layer", 1)),
                blush_layers=int(row.get("blush_layers", 1)),
                mascara_layer=int(row.get("mascara_layer", 1)),
                concealer_layer=int(row.get("concealer_layer", 1)),
                foundation_ml=str(row.get("foundation_ml", "")),
                lipstick_ml=str(row.get("lipstick_ml", "")),
                cost_of_makeup=int(row.get("cost_of_makeup", 0) if pd.notna(row.get("cost_of_makeup")) else 0),
                risk_level=str(row.get("risk_level", "")),
                longevity=str(row.get("longevity", "")),
                luminance_bucket=str(row.get("luminance_bucket", ""))
            )
            products.append(product)
            
            if len(products) >= 500:
                db.bulk_save_objects(products)
                db.commit()
                products = []
                
        if products:
            db.bulk_save_objects(products)
            db.commit()
            
        print("Database Seeding Complete! Production ready.")
    except Exception as e:
        print(f"Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
