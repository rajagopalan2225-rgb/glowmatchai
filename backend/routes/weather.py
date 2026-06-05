import os
from fastapi import APIRouter, Query, HTTPException
from utils.weather_service import get_weather, search_cities

# Router for weather API endpoints using weather_service for fetching and formatting
router = APIRouter()

@router.get("/search")
async def search(q: str = Query(..., min_length=1)):
    """
    Search cities by query term.
    """
    return await search_cities(q)

@router.get("")
async def get_weather_tips(city: str = Query("Chennai")):
    """
    Get live weather and makeup tips for a city.
    """
    w_info = await get_weather(city)
    # If service returns a validation or connection error, raise HTTPException
    if w_info.get("error"):
        raise HTTPException(status_code=400, detail=w_info["error"])
    return w_info

