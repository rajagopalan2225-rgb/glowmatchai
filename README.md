✨ GlowMatch AI

AI-Powered Makeup Analysis & Recommendation System

GlowMatch AI is a full-stack AI application that analyzes a user’s skin tone and provides personalized makeup recommendations based on skin tone, makeup preferences, and weather conditions.

⸻

🚀 Features

* 🧠 Skin Tone Analysis using a CNN model
* 💄 Makeup Recommendations based on skin tone and makeup mode
* 🌦️ Weather-Based Beauty Tips using OpenWeather API
* ✨ Before & After Transformation Analysis
* 📊 Dataset-Based Recommendations
* 📱 Simple and responsive user interface

⸻

🛠️ Technology Stack

Frontend

* React.js
* JavaScript
* CSS
* Vite

Backend

* Python
* FastAPI

AI / ML

* TensorFlow
* CNN
* Machine Learning

API

* OpenWeather API

⸻

📂 Project Structure

GlowMatchAI/
│
├── backend/
│   ├── model/
│   ├── training_data/
│   ├── data.csv
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md

⸻

▶️ How to Run

1. Clone the Repository

git clone https://github.com/rajagopalan2225-rgb/glowmatchai.git
cd glowmatchai

2. Backend Setup

cd backend
pip install -r requirements.txt

Create a .env file and add your OpenWeather API key:

OPENWEATHER_API_KEY=your_api_key

Start the backend:

uvicorn main:app --reload --port 8000

Backend:

http://localhost:8000

3. Frontend Setup

Open another terminal:

cd frontend
npm install
npm run dev

Frontend:

http://localhost:5173

⸻

🧠 Model Training

If you have the training dataset, you can train the CNN model using:

python model/train_model.py

Dataset structure:

training_data/
├── Fair/
├── Medium/
└── Dark/

⸻

📊 Dataset

The data.csv file contains makeup recommendation information such as:

* Skin tone
* Makeup mode
* Product name
* Foundation shade
* Lipstick
* Blush
* Other makeup details

⸻

📈 API Endpoints

Endpoint	Method	Purpose
/api/predict	POST	Predict skin tone
/api/recommend	GET	Get makeup recommendations
/api/recommend/modes	GET	Get available makeup modes
/api/weather	GET	Get weather-based tips
/api/transform	POST	Analyze before/after transformation

⸻

🚀 Future Enhancements

* Foundation shade matching
* Advanced AI beauty assistant
* Personalized beauty profiles
* Mobile application
* E-commerce integration
* Improved AI model accuracy

⸻

📄 License

This project is developed for academic and educational purposes.

⸻

👨‍💻 Developed By

Rajagopalan

B.Tech Information Technology

GlowMatch AI — Makeup Analysis & Recommendation System
