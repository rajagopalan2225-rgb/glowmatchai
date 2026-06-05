import os
import httpx

# Reusable weather service handling OpenWeatherMap API integration
# and generating makeup recommendations based on weather parameters.

async def get_weather(city_or_coords: str) -> dict:
    """
    Fetches live weather data for a given city or coordinates from OpenWeatherMap.
    Returns structured weather details or propagates error/fallback details.
    """
    api_key = os.getenv("OPENWEATHER_API_KEY") or os.getenv("WEATHER_API_KEY")
    clean_city = city_or_coords.replace("id:", "").strip()
    
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"appid": api_key, "units": "metric"}

    # Check if sanitized city is in lat,lon format
    if "," in clean_city:
        try:
            lat, lon = clean_city.split(",")
            params["lat"] = lat.strip()
            params["lon"] = lon.strip()
        except Exception:
            params["q"] = clean_city
    else:
        params["q"] = clean_city

    default_tip = "Great day for any look! Experiment freely."
    
    # 1. No internet/network connection or API failure handling
    try:
        if not api_key:
            raise ValueError("API Key is missing. Running in demo fallback mode.")
            
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, timeout=5)
            except httpx.RequestError as e:
                # Handle No internet / connection failure
                raise ValueError("No internet connection available. Please check your network and try again.")
                
            if resp.status_code == 404:
                # Handle Invalid city/location
                raise ValueError(f"Invalid city / location name '{clean_city}'. Please try another.")
            elif resp.status_code != 200:
                # Handle API failure
                raise ValueError(f"OpenWeather API error: received status code {resp.status_code}.")
                
            data = resp.json()
            temp = round(data["main"]["temp"])
            humidity = data["main"]["humidity"]
            condition = data["weather"][0]["main"]
            desc = data["weather"][0]["description"].lower()
            
            # Map condition to user friendly label (Sunny, Rainy, Cloudy, Cold, etc.)
            user_condition = "Sunny"
            if "rain" in desc or "drizzle" in desc or "thunderstorm" in desc:
                user_condition = "Rainy"
            elif "cloud" in desc or "mist" in desc or "fog" in desc or "haze" in desc:
                user_condition = "Cloudy"
            elif temp < 15:
                user_condition = "Cold"
            elif "clear" in desc:
                user_condition = "Sunny"
            else:
                user_condition = condition

            rain_status = "Rainy" if "rain" in desc or "drizzle" in desc or "thunderstorm" in desc else "Dry"

            # Dynamic beauty tip
            tip = default_tip
            if temp > 30:
                tip = "High Heat Alert: Use matte and sweat-proof products to prevent melting."
            elif humidity > 70:
                tip = "High Humidity Alert: Waterproof and transfer-proof makeup is essential."
            elif temp < 15:
                tip = "Cold/Dry Alert: Focus on hydrating and moisturizing formulas."
            elif "rain" in desc or "drizzle" in desc:
                tip = "Rain Alert: Waterproof and transfer-proof makeup is essential."

            return {
                "city": data["name"],
                "temperature": temp,
                "humidity": humidity,
                "condition": user_condition,
                "rain_status": rain_status,
                "description": desc,
                "tip": tip,
                "error": None
            }
            
    except Exception as e:
        error_msg = str(e)
        print(f"Weather API Error / Fallback triggered: {error_msg}")
        
        # Propagate validation errors (invalid city, no internet) directly
        if "Invalid city" in error_msg or "No internet connection" in error_msg:
            return {
                "city": clean_city,
                "temperature": 25,
                "humidity": 50,
                "condition": "Cloudy",
                "rain_status": "Dry",
                "description": "scattered clouds",
                "tip": "Demo Mode: " + default_tip,
                "demo": True,
                "error": error_msg
            }
            
        # General API failure/missing key fallback for local demo offline testing
        return {
            "city": f"{clean_city.split(',')[0]} (Demo)",
            "temperature": 25,
            "humidity": 50,
            "condition": "Cloudy",
            "rain_status": "Dry",
            "description": "scattered clouds",
            "tip": "Demo Mode: " + default_tip,
            "demo": True,
            "error": None
        }

async def search_cities(q: str) -> list:
    """
    Search for cities matching query string. Falls back to static list if API key is absent.
    """
    api_key = os.getenv("OPENWEATHER_API_KEY") or os.getenv("WEATHER_API_KEY")
    if not api_key:
        mock_cities = [
            {"id": "chennai", "name": "Chennai", "region": "Tamil Nadu", "country": "India"},
            {"id": "mumbai", "name": "Mumbai", "region": "Maharashtra", "country": "India"},
            {"id": "delhi", "name": "New Delhi", "region": "Delhi", "country": "India"},
            {"id": "london", "name": "London", "region": "Greater London", "country": "UK"},
            {"id": "nyc", "name": "New York", "region": "New York", "country": "USA"}
        ]
        return [c for c in mock_cities if q.lower() in c["name"].lower()]

    url = "http://api.openweathermap.org/geo/1.0/direct"
    params = {"q": q, "limit": 5, "appid": api_key}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=5)
            if resp.status_code == 200:
                results = resp.json()
                return [
                    {
                        "id": f"{r['lat']},{r['lon']}",
                        "name": r["name"],
                        "region": r.get("state", ""),
                        "country": r.get("country", ""),
                        "label": f"{r['name']}, {r.get('state', '')} — {r.get('country', '')}".strip(", —"),
                    }
                    for r in results
                ]
    except Exception as e:
        print(f"Weather search error: {e}")
    return []
