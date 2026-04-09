from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from models import User, Image
from database import get_db
from routes.auth import get_current_user
import base64

router = APIRouter()

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload an image to PostgreSQL (stored as Base64)"""
    contents = await file.read()
    
    # Check max file size (e.g. 5MB)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max size is 5MB.")
        
    encoded_string = base64.b64encode(contents).decode('utf-8')
    mime_type = file.content_type or "image/jpeg"
    base64_image = f"data:{mime_type};base64,{encoded_string}"
    
    new_image = Image(
        image_data=base64_image,
        filename=file.filename,
        user_id=current_user.id
    )
    
    db.add(new_image)
    db.commit()
    db.refresh(new_image)
    
    return {
        "message": "Image uploaded successfully",
        "image_id": new_image.id,
        "filename": new_image.filename
    }

@router.get("/my-images")
async def get_my_images(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all images for the current user"""
    images = db.query(Image).filter(Image.user_id == current_user.id).all()
    return [
        {
            "id": img.id,
            "filename": img.filename,
            "image_data": img.image_data,
            "created_at": img.created_at
        } for img in images
    ]
