from fastapi import APIRouter, File, UploadFile, HTTPException
from utils.image_processing import calculate_transformation_score

router = APIRouter()

@router.post("")
async def transform(before: UploadFile = File(...), after: UploadFile = File(...)):
    before_bytes = await before.read()
    after_bytes = await after.read()
    
    try:
        result = calculate_transformation_score(before_bytes, after_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return result
