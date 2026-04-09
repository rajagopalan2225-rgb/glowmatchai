from fastapi import APIRouter, Request, Query
from utils.dataset_handler import get_recommendations, get_all_modes

router = APIRouter()

@router.get("")
async def recommend(request: Request, skin_tone: str = Query(...), mode: str = Query("Daily")):
    products = get_recommendations(request.app.state.df, skin_tone, mode)
    return {
        "skin_tone": skin_tone,
        "mode": mode,
        "count": len(products),
        "products": products
    }

@router.get("/modes")
async def fetch_modes(request: Request):
    modes = get_all_modes(request.app.state.df)
    return {"modes": modes}
