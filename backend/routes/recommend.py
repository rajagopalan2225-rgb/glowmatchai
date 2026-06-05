from fastapi import APIRouter, Request, Query
from utils.dataset_handler import get_recommendations, get_all_modes
import time

router = APIRouter()

@router.get("")
async def recommend(
    request: Request,
    skin_tone: str = Query(...),
    mode: str = Query("simple"),
    seed: str = Query(None),
):
    # Build a seed for variety: rotate every 5 minutes if no seed provided
    if not seed:
        time_bucket = str(int(time.time()) // 300)
        seed = f"{skin_tone}|{mode}|{time_bucket}"

    products = get_recommendations(request.app.state.df, skin_tone, mode, seed=seed)
    return {
        "skin_tone": skin_tone,
        "mode": mode,
        "count": len(products),
        "products": products,
    }

@router.get("/modes")
async def fetch_modes(request: Request):
    modes = get_all_modes(request.app.state.df)
    return {"modes": modes}
