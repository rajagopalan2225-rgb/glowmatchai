# ✨ AI Beauty Studio — Makeup Analysis & Recommendation System

A premium, full-stack AI platform designed to provide personalized beauty insights. This application uses Computer Vision and Machine Learning to analyze skin tones, provide dataset-aware recommendations, fetch live weather-based tips, and quantify make-up transformations.

## 🚀 Quick Start (No Docker)

### 1. Clone and Set Up Backend
```bash
cd backend
pip install -r requirements.txt
# add your OpenWeather API key to .env
cp .env.example .env
```

### 2. (Optional) Train the Model
If you have a `training_data/` folder with subfolders `Fair`, `Medium`, and `Dark`, you can retrain the CNN:
```bash
python model/train_model.py
```

### 3. Start Backend
```bash
uvicorn main:app --reload --port 8000
```

### 4. Set Up Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

### 5. Open the App
Navigate to `http://localhost:5173`.

---

## 🛠️ Features

- **Skin Analysis**: Upload a selfie to detect your skin tone using a TensorFlow CNN model.
- **Smart Recommendations**: Get tailored product suggestions from our dataset based on your skin tone and desired "look" (Daily, Party, Office, etc.).
- **Weather Widget**: Real-time beauty tips based on your local weather conditions (Heat, Humidity, Rain).
- **Transformation Tool**: Compare "Before" and "After" photos to see your transformation percentage with AI feedback.

---

## 📊 Dataset Reference (`data.csv`)

The application expects a `data.csv` in the `backend/` directory with the following columns:
- `skin_tone`: Fair, Medium, or Dark
- `mode`: Daily, Party, Office, Bridal, etc.
- `product_name`: Name of the makeup product
- *(Optional columns for foundation shade, lipstick, etc. will be displayed in the UI)*

## 🔑 API Keys
Get a free OpenWeather API key at [openweathermap.org](https://openweathermap.org/) and place it in `backend/.env`.

---

## 📈 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/predict` | POST | Analyzes skin tone from a multipart image file. |
| `/api/recommend` | GET | Returns product recommendations for `skin_tone` and `mode`. |
| `/api/recommend/modes` | GET | Returns all unique application modes from the dataset. |
| `/api/weather` | GET | Fetches live weather and beauty tips for a given `city`. |
| `/api/transform` | POST | Calculates transformation score between two images. |
# glowmatchai
