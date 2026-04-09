from fastapi import APIRouter, File, UploadFile, Request, HTTPException
import numpy as np
from utils.image_processing import detect_and_crop_face, preprocess_for_model, classify_skin_tone

router = APIRouter()

@router.post("")
async def predict_skin_tone(request: Request, file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files allowed.")

    contents = await file.read()

    # Detect and crop face
    try:
        cropped = detect_and_crop_face(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Try model-based inference first
    model = request.app.state.model
    class_indices = request.app.state.class_indices

    if model is not None:
        try:
            model_input = preprocess_for_model(cropped)
            preds = model.predict(model_input)[0]
            idx = int(np.argmax(preds))
            label = class_indices.get(str(idx), "Medium")
            probs = {class_indices.get(str(i), f"Class {i}"): float(p) for i, p in enumerate(preds)}
            return {
                "skin_tone": label,
                "confidence": float(preds[idx]),
                "all_probabilities": probs
            }
        except Exception:
            pass  # Fall through to pixel-based analysis

    # Accurate pixel-based skin tone classification (works without a trained model)
    result = classify_skin_tone(cropped)
    # Remove debug info from public response
    result.pop("_debug", None)
    return result
