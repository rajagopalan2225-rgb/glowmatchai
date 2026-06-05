from fastapi import APIRouter, File, UploadFile, Request, Form, HTTPException
from typing import Optional
import numpy as np

# Import existing logic to fulfill all requirements
from utils.image_processing import (
    detect_and_crop_face,
    preprocess_for_model,
    classify_skin_tone,
    calculate_transformation_score
)
from utils.dataset_handler import get_best_match_row
from utils.weather_service import get_weather
import uuid
import time

router = APIRouter()

@router.post("")
async def full_analysis(
    request: Request,
    image: UploadFile = File(None),
    mode: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    before_image: UploadFile = File(None),
    after_image: UploadFile = File(None)
):
    response_data = {}

    # STEP 1 & 2: IMAGE INPUT & AI SKIN ANALYSIS
    if image is None or not image.filename:
        raise HTTPException(status_code=400, detail="A face photo is required for analysis. Please upload or capture an image.")

    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")
    
    contents = await image.read()
    
    try:
        # OpenCV Face Detection - strictly rejects if no face
        cropped = detect_and_crop_face(contents)
        
        # Predict skin tone
        model = request.app.state.model
        class_indices = request.app.state.class_indices
        
        skin_result = None
        if model is not None:
            try:
                model_input = preprocess_for_model(cropped)
                preds = model.predict(model_input)[0]
                idx = int(np.argmax(preds))
                label = class_indices.get(str(idx), "Medium")
                skin_result = {
                    "skin_tone": label,
                    "confidence": float(preds[idx])
                }
            except Exception:
                pass
        
        if skin_result is None:
            skin_result = classify_skin_tone(cropped)
            skin_result = {
                "skin_tone": skin_result.get("skin_tone", "Medium"),
                "confidence": skin_result.get("confidence", 0.85)
            }
        
        response_data["skin_tone"] = skin_result["skin_tone"]
        response_data["confidence"] = skin_result["confidence"]
    
    except ValueError as e:
        # This will be caught when detect_and_crop_face finds no face
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal analysis error: {str(e)}")

    # Generate unified fake defaults if we don't have enough data
    st = response_data.get("skin_tone", "Medium")

    # STEP 3 & 4: MODE AND MAKEUP DETAILS
    rec_row = None
    if mode:
        response_data["mode"] = mode

        df = request.app.state.df
        if df is not None:
            # Use a unique seed so every user/session gets a different product variety.
            # Seed combines skin_tone + mode + time-bucket (rotates every 5 min)
            time_bucket = str(int(time.time()) // 300)  # changes every 5 minutes
            seed = f"{st}|{mode}|{time_bucket}"
            rec_row = get_best_match_row(df, st, mode, seed=seed)
                
        def fmt(val): return str(val).replace('_', ' ').title()

        def get_product_name(shade_key: str, product_type: str) -> str:
            """Return generic top-rated product name for search, stripped of hardcoded brands."""
            clean = str(shade_key).strip().replace('_', ' ').title()
            return f"Top Rated {clean} {product_type.title()}"

        if rec_row is not None:
            makeup = {
                "foundation": f"Apply {rec_row.get('foundation_layer', 1)} layer{'s' if int(rec_row.get('foundation_layer', 1)) > 1 else ''} (~{rec_row.get('foundation_ml', 2.0)} ml) of {fmt(rec_row.get('foundation', 'standard'))} foundation",
                "lipstick":   f"{rec_row.get('lipstick_layer', 1)} layer of {fmt(rec_row.get('lipstick', 'nude'))} lipstick",
                "blush":      f"{rec_row.get('blush_layers', 1)} layer{'s' if int(rec_row.get('blush_layers', 1)) > 1 else ''} of {fmt(rec_row.get('blush', 'soft blush'))} blush",
                "mascara":    f"{rec_row.get('mascara_layer', 1)} coat{'s' if int(rec_row.get('mascara_layer', 1)) > 1 else ''} of {fmt(rec_row.get('mascara_shade', 'black'))} mascara",
                "concealer":  f"{rec_row.get('concealer_layer', 1)} layer of {fmt(rec_row.get('concealer', 'natural concealer'))} concealer",
            }
            makeup_product_names = {
                "foundation": get_product_name(rec_row.get('foundation', 'sand'), 'foundation'),
                "lipstick":   get_product_name(rec_row.get('lipstick', 'nude'), 'lipstick'),
                "blush":      get_product_name(rec_row.get('blush', 'soft_blush'), 'blush'),
                "mascara":    get_product_name(rec_row.get('mascara_shade', 'black'), 'mascara'),
                "concealer":  get_product_name(rec_row.get('concealer', 'natural_concealer'), 'concealer'),
            }
        else:
            # Fallback product names based on skin tone + mode
            _tone = st.lower()
            if mode.lower() == "simple":
                makeup = {
                    "foundation": f"1 layer of {_tone} light BB cream",
                    "lipstick":   "1 layer of nude lip gloss",
                    "blush":      "subtle peach cream blush",
                    "mascara":    "1 coat of volumizing mascara",
                    "concealer":  "light dabs under eye and T-zone"
                }
                makeup_product_names = {
                    "foundation": f"Top Rated BB Cream {_tone.title()}",
                    "lipstick":   "Top Rated Nude Lip Gloss",
                    "blush":      "Top Rated Peach Cream Blush",
                    "mascara":    "Top Rated Volumizing Mascara",
                    "concealer":  "Top Rated Matte Concealer"
                }
            elif mode.lower() == "occasion":
                makeup = {
                    "foundation": f"3 layers of matte {_tone} foundation",
                    "lipstick":   "2 layers of deep matte crimson lipstick",
                    "blush":      "soft blush for occasion",
                    "mascara":    "3 coats of dramatic false-lash effect mascara",
                    "concealer":  "full coverage concealer"
                }
                makeup_product_names = {
                    "foundation": f"Top Rated Matte Foundation {_tone.title()}",
                    "lipstick":   "Top Rated Bold Red Matte Lipstick",
                    "blush":      "Top Rated Shimmer Blush",
                    "mascara":    "Top Rated False Lash Mascara",
                    "concealer":  "Top Rated Full Coverage Concealer"
                }
            else:  # weather or default
                makeup = {
                    "foundation": f"2 layers of {_tone} matching liquid foundation",
                    "lipstick":   "1 layer of bold ruby lipstick",
                    "blush":      "subtle peach cream blush",
                    "mascara":    "waterproof carbon black mascara",
                    "concealer":  "light dabs under eye and T-zone"
                }
                makeup_product_names = {
                    "foundation": f"Top Rated Liquid Foundation {_tone.title()}",
                    "lipstick":   "Top Rated Satin Ruby Lipstick",
                    "blush":      "Top Rated Peach Blush",
                    "mascara":    "Top Rated Curling Waterproof Mascara",
                    "concealer":  "Top Rated Liquid Concealer"
                }
            
        weather_info = None
        if mode.lower() == "weather":
            if city:
                # Call weather_service to fetch live weather details
                weather_info = await get_weather(city)
                if weather_info.get("error"):
                    # Propagate invalid city or connection error directly to frontend
                    raise HTTPException(status_code=400, detail=weather_info["error"])
                
                w_temp = weather_info.get("temperature", 25)
                w_cond = weather_info.get("condition", "Sunny")
                w_rain = weather_info.get("rain_status", "Dry")
                w_humidity = weather_info.get("humidity", 50)
                
                # Apply dynamic makeup logic based on live weather conditions
                if w_temp > 30 or w_cond == "Sunny" or w_cond == "Clear":
                    # Hot weather
                    weather_info["tip"] = "High Heat Alert: Use matte and sweat-proof products to prevent melting."
                    makeup["foundation"] = f"Apply 1 thin layer of matte {st.lower()} foundation (low layers)."
                    makeup["mascara"] = "Apply 1 coat of waterproof eyeliner and waterproof mascara."
                    makeup_product_names["foundation"] = f"Top Rated Matte Foundation ({st})"
                    makeup_product_names["mascara"] = "Top Rated Waterproof Eyeliner & Mascara"
                elif w_rain == "Rainy" or w_cond == "Rainy":
                    # Rainy weather
                    weather_info["tip"] = "Rain Alert: Waterproof and transfer-proof makeup is essential."
                    makeup["foundation"] = f"Apply 1 layer of waterproof {st.lower()} makeup."
                    makeup["lipstick"] = "Apply 1 layer of long-lasting matte lipstick."
                    makeup_product_names["foundation"] = f"Top Rated Waterproof Foundation ({st})"
                    makeup_product_names["lipstick"] = "Top Rated Long-Lasting Matte Lipstick"
                elif w_temp < 15 or w_cond == "Cold":
                    # Cold weather
                    weather_info["tip"] = "Cold/Dry Alert: Focus on hydrating and moisturizing formulas."
                    makeup["foundation"] = f"Apply 2 layers of hydrating {st.lower()} foundation."
                    makeup["blush"] = "Apply 2 layers of cream blush for a hydrated look."
                    makeup_product_names["foundation"] = f"Top Rated Hydrating Foundation ({st})"
                    makeup_product_names["blush"] = "Top Rated Hydrating Cream Blush"
                else:
                    # Mild / Default weather
                    weather_info["tip"] = "Mild Weather: Perfect conditions for any flexible, balanced makeup routine."
                    makeup["foundation"] = f"Apply 1 layer of standard {st.lower()} foundation suitable for all-day wear."
                    makeup["blush"] = "Apply 1 layer of your choice of cream or powder blush."
                    makeup["lipstick"] = "Apply 1 layer of classic cream or satin finish lipstick."
                    makeup["mascara"] = "Apply 1 coat of standard volumizing mascara."
                    makeup["concealer"] = "Apply 1 layer of standard concealer, lightly set."
                    makeup_product_names["foundation"] = f"Top Rated Matte Poreless Foundation ({st})"
                    makeup_product_names["lipstick"]   = "Top Rated Satin Finish Lipstick"
                    makeup_product_names["blush"]      = "Top Rated Natural Powder Blush"
                    makeup_product_names["mascara"]    = "Top Rated Volumizing Lash Mascara"
                    makeup_product_names["concealer"]  = "Top Rated Natural Matte Concealer"
                    
                response_data["weather"] = {
                    "city": weather_info.get("city", city),
                    "temp": w_temp,
                    "condition": w_cond,
                    "humidity": w_humidity,
                    "rain_status": w_rain,
                    "tip": weather_info.get("tip", "Standard everyday look applies.")
                }
                    
        response_data["makeup_details"] = makeup
        response_data["makeup_product_names"] = makeup_product_names

    # STEP 5: TRANSFORMATION
    if before_image is not None and after_image is not None:
        b_chars = await before_image.read()
        a_chars = await after_image.read()
        try:
            trans_result = calculate_transformation_score(b_chars, a_chars)
            score = trans_result.get("transformation_percentage", 65.0)

            # ── Longevity: strictly from the dataset row (actual product wear time) ──
            if rec_row is not None:
                longevity = str(rec_row.get("longevity", "")).strip()
                if not longevity or longevity.lower() in ("nan", "none", ""):
                    longevity = "8 hrs"  # realistic default only if completely missing

                # ── Risk: derived from the actual recommended MakeUp products ──────
                # Factors:
                #   1. Dataset risk_level — reflects formula heaviness in training data
                #   2. Foundation layers — more layers = more occlusion risk
                #   3. Mode — occasion/heavy makeup = higher skin stress
                raw_risk    = str(rec_row.get("risk_level", "medium")).strip().lower()
                f_layers    = int(rec_row.get("foundation_layer", 1))
                rec_mode    = str(rec_row.get("mode", "simple")).strip().lower()

                # Weighted score (0‒2): dataset label + layer penalty + mode penalty
                risk_score = {"low": 0, "medium": 1, "high": 2}.get(raw_risk, 1)
                if f_layers >= 3:
                    risk_score += 1
                if rec_mode == "occasion":
                    risk_score += 1

                if risk_score <= 1:
                    risk_label = "Low"
                    risk_note  = "Breathable, lightweight formulas — safe for everyday wear."
                elif risk_score <= 2:
                    risk_label = "Moderate"
                    risk_note  = "Medium-coverage products — cleanse thoroughly after 8–10 hrs."
                else:
                    risk_label = "High"
                    risk_note  = "Full-coverage / multi-layer look — must remove completely before sleep to avoid pore congestion."
            else:
                # No dataset row — only report what we genuinely know from the mode
                m = str(mode or "").strip().lower()
                if m == "simple":
                    longevity  = "6–8 hrs"
                    risk_label = "Low"
                    risk_note  = "Lightweight everyday formulas — minimal skin stress."
                elif m == "occasion":
                    longevity  = "10–12 hrs"
                    risk_label = "Moderate"
                    risk_note  = "Multi-layer look — cleanse completely after the event."
                else:
                    longevity  = "8–10 hrs"
                    risk_label = "Low"
                    risk_note  = "Standard formulas — gentle on skin."

            response_data["transformation"] = {
                "score":      score,
                "longevity":  longevity,
                "risk_label": risk_label,
                "risk_note":  risk_note,
                "feedback":   trans_result.get("feedback", "Transformation recorded."),
            }
        except Exception:
            pass

    return response_data
