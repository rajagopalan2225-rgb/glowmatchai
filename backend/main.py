import os
import json
import pandas as pd
# TensorFlow is optional — if not installed the app uses pixel-based skin analysis
try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    tf = None
    TF_AVAILABLE = False
    print("INFO: TensorFlow not installed — using pixel-based skin classifier.")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes import predict, recommend, weather, transform, auth, full_analysis, images

# Load environment
load_dotenv(override=True)

app = FastAPI(title="AI Makeup Analysis System")

# CORS config
# Build allowed origins list from env (comma-separated) + local dev default
default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://skintoneai.onrender.com",
    "https://glowmatchai.onrender.com"
]

_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
env_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

ALLOWED_ORIGINS = list(set(default_origins + env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.on_event("startup")
async def startup_event():
    # Initialize Database
    from database import engine, Base
    import models
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")

    # Load model
    model_path = os.path.join(BASE_DIR, "model/skin_tone_model.h5")
    if TF_AVAILABLE and os.path.exists(model_path):
        app.state.model = tf.keras.models.load_model(model_path)
        print(f"Model loaded from {model_path}")
    else:
        app.state.model = None
        if not TF_AVAILABLE:
            print("INFO: Running without TensorFlow — pixel-based classifier active.")
        else:
            print(f"Warning: Model not found at {model_path}")
        
    # Load dataset
    data_path = os.path.join(BASE_DIR, "cleaned_data.csv")
    if os.path.exists(data_path):
        app.state.df = pd.read_csv(data_path)
    else:
        app.state.df = None
        print(f"Warning: Dataset not found at {data_path}")
        
    # Load class indices
    indices_path = os.path.join(BASE_DIR, "model/class_indices.json")
    if os.path.exists(indices_path):
        with open(indices_path, 'r') as f:
            app.state.class_indices = json.load(f)
    else:
        app.state.class_indices = {"0": "Fair", "1": "Medium", "2": "Dark"}

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(predict.router, prefix="/api/predict", tags=["Prediction"])
app.include_router(recommend.router, prefix="/api/recommend", tags=["Recommendation"])
app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])
app.include_router(transform.router, prefix="/api/transform", tags=["Transformation"])
app.include_router(full_analysis.router, prefix="/api/full-analysis", tags=["Full Analysis"])
app.include_router(images.router, prefix="/api/images", tags=["Images"])

@app.get("/")
async def root():
    return {"message": "AI Beauty Studio API is running", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
