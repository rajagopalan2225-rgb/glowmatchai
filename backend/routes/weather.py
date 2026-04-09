import os
from fastapi import APIRouter, Query
import httpx

router = APIRouter()

@router.get("/search")
async def search_cities(q: str = Query(..., min_length=1)):
    api_key = os.getenv("WEATHER_API_KEY")
    url = f"https://api.weatherapi.com/v1/search.json?key={api_key}&q={q}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=5)
            if resp.status_code != 200:
                return []
            results = resp.json()
            return [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "region": r.get("region", ""),
                    "country": r.get("country", ""),
                    "label": f"{r['name']}, {r.get('region', '')} — {r.get('country', '')}".strip(", —"),
                }
                for r in results
            ]
    except Exception:
        return []

@router.get("")
async def get_weather_tips(city: str = Query("Chennai")):
    api_key = os.getenv("WEATHER_API_KEY")
    url = f"https://api.weatherapi.com/v1/current.json?key={api_key}&q={city}&aqi=no"

    # Beauty tip logic
    default_tip = "Great day for any look! Experiment freely."

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=5)
            if resp.status_code != 200:
                raise Exception(f"WeatherAPI error: {resp.status_code}")
            data = resp.json()

            temp = data["current"]["temp_c"]
            humidity = data["current"]["humidity"]
            condition = data["current"]["condition"]["text"]
            desc = condition.lower()

            tip = default_tip
            if temp > 30:
                tip = "Use matte, long-wear formulas. Avoid heavy foundations."
            elif humidity > 70:
                tip = "Opt for waterproof mascara and a good setting spray."
            elif temp < 15:
                tip = "Use hydrating primers and cream-based blushes."
            elif "rain" in desc:
                tip = "Waterproof everything. Keep the look minimal."

            return {
                "city": data["location"]["name"],
                "temperature": temp,
                "humidity": humidity,
                "condition": condition,
                "description": condition,
                "beauty_tip": tip,
            }
    except Exception as e:
        print(f"Weather API fallback triggered: {e}")
        # Fallback for demo / offline mode
        return {
            "city": f"{city} (Demo)",
            "temperature": 28,
            "humidity": 65,
            "condition": "Clear Sky",
            "description": "Clear Sky",
            "beauty_tip": default_tip,
            "demo": True,
        }
