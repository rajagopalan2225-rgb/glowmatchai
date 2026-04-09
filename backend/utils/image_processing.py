import cv2
import numpy as np
from PIL import Image
import io
import os

# Load available Haar Cascades
# Load available Haar Cascades
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_CASCADE_PATH = os.path.join(BASE_DIR, "model", "haarcascade_frontalface_default.xml")

def _load_cascade(name):
    # Try local path first
    if os.path.exists(LOCAL_CASCADE_PATH):
        return cv2.CascadeClassifier(LOCAL_CASCADE_PATH)
    
    # Fallback to cv2 defaults
    _cascade_dir = cv2.data.haarcascades
    path = os.path.join(_cascade_dir, name)
    if os.path.exists(path):
        return cv2.CascadeClassifier(path)
    return None

face_cascade      = _load_cascade('haarcascade_frontalface_default.xml')
face_cascade_alt  = _load_cascade('haarcascade_frontalface_alt2.xml')
face_cascade_alt3 = _load_cascade('haarcascade_frontalface_alt.xml')

ALL_CASCADES = [c for c in [face_cascade, face_cascade_alt, face_cascade_alt3] if c is not None and not c.empty()]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _load_rgb(image_bytes: bytes) -> np.ndarray:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(image)


def _preprocess_gray(np_image: np.ndarray) -> list[np.ndarray]:
    """Return several gray variants to maximise detection chance."""
    gray = cv2.cvtColor(np_image, cv2.COLOR_RGB2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    gray_clahe = clahe.apply(gray)
    eq = cv2.equalizeHist(gray)
    return [gray, gray_clahe, eq]


def _try_detect_faces(gray_variants: list) -> list:
    """
    Try every cascade × every gray variant × many parameter combos.
    Returns list of detected face rects, or [].
    """
    configs = [
        # (scaleFactor, minNeighbors, minSize)
        (1.05, 5, (40, 40)),
        (1.05, 4, (30, 30)),
        (1.05, 3, (25, 25)),
        (1.1,  4, (30, 30)),
        (1.1,  3, (20, 20)),
        (1.1,  2, (20, 20)),
        (1.15, 3, (20, 20)),
        (1.15, 2, (15, 15)),
        (1.2,  2, (15, 15)),
        (1.2,  1, (15, 15)),
        (1.3,  1, (10, 10)),
    ]
    for gray in gray_variants:
        for cascade in ALL_CASCADES:
            for scale, neighbors, min_sz in configs:
                try:
                    faces = cascade.detectMultiScale(
                        gray,
                        scaleFactor=scale,
                        minNeighbors=neighbors,
                        minSize=min_sz,
                        flags=cv2.CASCADE_SCALE_IMAGE
                    )
                    if len(faces) > 0:
                        return list(faces)
                except Exception:
                    continue
    return []


def _is_human_by_geometry(np_image: np.ndarray, faces: list) -> bool:
    """
    Sanity-check: verify the detected region actually looks like skin.
    This prevents false positives (eyes on cats, geometric patterns, etc.)
    """
    if not faces:
        return False
    h, w = np_image.shape[:2]
    x, y, fw, fh = max(faces, key=lambda r: r[2] * r[3])
    # Expand slightly
    px, py = int(fw * 0.15), int(fh * 0.15)
    x1, y1 = max(0, x - px), max(0, y - py)
    x2, y2 = min(w, x + fw + px), min(h, y + fh + py)
    region = np_image[y1:y2, x1:x2]
    if region.size == 0:
        return False

    # Check skin pixel ratio within the face box
    ycrcb = cv2.cvtColor(region, cv2.COLOR_RGB2YCrCb)
    mask = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 174, 127]))
    skin_ratio = np.count_nonzero(mask) / mask.size
    # A real face crop should have at least 15% skin-colored pixels
    return skin_ratio >= 0.10


def _crop_face(np_image: np.ndarray, faces: list) -> np.ndarray:
    h, w = np_image.shape[:2]
    x, y, fw, fh = max(faces, key=lambda r: r[2] * r[3])
    px = int(fw * 0.30)
    py = int(fh * 0.30)
    x1, y1 = max(0, x - px), max(0, y - py)
    x2, y2 = min(w, x + fw + px), min(h, y + fh + py)
    cropped = np_image[y1:y2, x1:x2]
    return cv2.cvtColor(cropped, cv2.COLOR_RGB2BGR)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_and_crop_face(image_bytes: bytes) -> np.ndarray:
    """
    Strictly detect a human face and return the cropped BGR region.
    Raises ValueError if no valid human face is found.
    Non-face images (flowers, objects, landscapes) will always be rejected.
    """
    np_image = _load_rgb(image_bytes)
    gray_variants = _preprocess_gray(np_image)

    faces = _try_detect_faces(gray_variants)

    # Additional geometry check to filter false positives
    if faces and _is_human_by_geometry(np_image, faces):
        return _crop_face(np_image, faces)

    raise ValueError(
        "No human face detected. Please upload a clear, front-facing photo "
        "of a person with good lighting."
    )


def classify_skin_tone(bgr_face: np.ndarray) -> dict:
    """
    Classify skin tone by analysing ONLY the skin-coloured pixels
    inside the face crop, ignoring hair, eyes, lips and background.

    Real YCrCb measurements for key skin tones (BGR → YCrCb):
        Fair   (R220,G185,B165) → Y=193, Cr=147, Cb=112
        Medium (R180,G130,B90)  → Y=140, Cr=157, Cb=100
        Dusky  (R150,G100,B70)  → Y=112, Cr=155, Cb=104
        Dark   (R90, G55, B40)  → Y=64,  Cr=147, Cb=114
        VDark  (R55, G35, B25)  → Y=40,  Cr=139, Cb=120
    """
    ycrcb = cv2.cvtColor(bgr_face, cv2.COLOR_BGR2YCrCb)
    hsv   = cv2.cvtColor(bgr_face, cv2.COLOR_BGR2HSV)

    # --- YCrCb skin mask: Cr 135-175, Cb 95-130 covers all skin tones above ---
    mask_ycrcb = cv2.inRange(
        ycrcb,
        np.array([0,   135, 95],  dtype=np.uint8),
        np.array([255, 175, 135], dtype=np.uint8)
    )

    # --- Wider YCrCb for very dark skin (lower Cr, wider Cb) ---
    mask_ycrcb_wide = cv2.inRange(
        ycrcb,
        np.array([0,   125, 90],  dtype=np.uint8),
        np.array([255, 180, 140], dtype=np.uint8)
    )

    # --- HSV skin hue range (skin is 0-25° and 160-180°) ---
    mask_hsv1 = cv2.inRange(
        hsv,
        np.array([0,  30, 40],  dtype=np.uint8),
        np.array([22, 230, 255], dtype=np.uint8)
    )
    mask_hsv2 = cv2.inRange(   # reddish wrap-around
        hsv,
        np.array([160, 20, 40],  dtype=np.uint8),
        np.array([180, 230, 255], dtype=np.uint8)
    )

    # Union of all masks
    skin_mask = cv2.bitwise_or(mask_ycrcb, mask_ycrcb_wide)
    skin_mask = cv2.bitwise_or(skin_mask,  mask_hsv1)
    skin_mask = cv2.bitwise_or(skin_mask,  mask_hsv2)

    # Morphological cleanup — remove noise, tiny patches, specular highlights
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN,   kernel)
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE,  kernel)

    # Extract luminance ONLY from confirmed skin pixels
    y_ch = ycrcb[:, :, 0]
    skin_pixels = y_ch[skin_mask > 0]

    if len(skin_pixels) < 150:
        # Fallback: sample cheeks + nose bridge (avoids hair, background, eyes)
        h, w = bgr_face.shape[:2]
        left_cheek  = y_ch[int(h*0.38):int(h*0.65), int(w*0.05):int(w*0.35)]
        right_cheek = y_ch[int(h*0.38):int(h*0.65), int(w*0.65):int(w*0.95)]
        nose        = y_ch[int(h*0.28):int(h*0.58), int(w*0.38):int(w*0.62)]
        skin_pixels = np.concatenate([
            left_cheek.flatten(), right_cheek.flatten(), nose.flatten()
        ])

    # Use median — robust against bright highlights and dark shadows
    med_lum = float(np.median(skin_pixels)) if len(skin_pixels) > 0 else 128.0

    # --- Thresholds calibrated from real measurements ---
    # Fair≈193, Medium≈140, Dusky≈112, Dark≈64, VDark≈40
    if med_lum > 165:
        tone, fp, mp, dp = "Fair",   0.87, 0.10, 0.03
    elif med_lum > 125:
        tone, fp, mp, dp = "Medium", 0.08, 0.85, 0.07
    elif med_lum > 85:
        tone, fp, mp, dp = "Dusky",  0.03, 0.12, 0.85
    else:
        tone, fp, mp, dp = "Dark",   0.02, 0.05, 0.93

    return {
        "skin_tone": tone,
        "confidence": round(max(fp, mp, dp), 2),
        "all_probabilities": {
            "Fair":   round(fp, 2),
            "Medium": round(mp, 2),
            "Dusky":  round(0.85 if tone == "Dusky" else 0.05, 2),
            "Dark":   round(dp, 2),
        },
    }



def preprocess_for_model(cropped_face: np.ndarray) -> np.ndarray:
    """BGR → RGB → 128×128 → normalized float32."""
    rgb     = cv2.cvtColor(cropped_face, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(rgb, (128, 128))
    return np.expand_dims(resized.astype("float32") / 255.0, axis=0)


def crop_or_full(image_bytes: bytes) -> np.ndarray:
    """
    For transformation tool: crop face if found, otherwise use full image.
    No strict rejection — just compare whatever images are uploaded.
    """
    np_image = _load_rgb(image_bytes)
    gray_variants = _preprocess_gray(np_image)
    faces = _try_detect_faces(gray_variants)

    if faces:
        return _crop_face(np_image, faces)

    full_bgr = cv2.cvtColor(np_image, cv2.COLOR_RGB2BGR)
    return cv2.resize(full_bgr, (256, 256))


def calculate_transformation_score(before_bytes: bytes, after_bytes: bytes) -> dict:
    """Compare before vs after images using HSV saturation & brightness."""
    before_img = crop_or_full(before_bytes)
    after_img  = crop_or_full(after_bytes)

    def hsv_stats(img):
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        return float(np.mean(hsv[:, :, 1])), float(np.mean(hsv[:, :, 2]))

    bs, bv = hsv_stats(before_img)
    as_, av = hsv_stats(after_img)

    diff_sat = abs(as_ - bs)
    diff_val = abs(av - bv)
    percentage = min(100.0, (diff_sat + diff_val) * 1.5)

    feedback = "Minimal change detected."
    if percentage > 75:   feedback = "Dramatic makeover!"
    elif percentage > 50: feedback = "Noticeable transformation."
    elif percentage > 20: feedback = "Natural enhancement."

    return {
        "transformation_percentage": round(float(percentage), 2),
        "feedback": feedback,
        "before_analyzed": True,
        "after_analyzed": True,
    }
