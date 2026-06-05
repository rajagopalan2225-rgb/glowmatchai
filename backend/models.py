from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    images = relationship("Image", back_populates="owner")

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    image_data = Column(Text, nullable=False) # Store base64 encoded image
    filename = Column(String(255), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="images")

class MakeupProduct(Base):
    __tablename__ = "makeup_products"

    id = Column(Integer, primary_key=True, index=True)
    skin_tone = Column(String(50), index=True)
    mode = Column(String(50), index=True)
    foundation = Column(String(255))
    lipstick = Column(String(255))
    blush = Column(String(255))
    eyeshadow = Column(String(255))
    eyeliner = Column(String(255))
    mascara_shade = Column(String(255))
    concealer = Column(String(255))
    highlighter = Column(String(255))
    foundation_layer = Column(Integer)
    lipstick_layer = Column(Integer)
    blush_layers = Column(Integer)
    mascara_layer = Column(Integer)
    concealer_layer = Column(Integer)
    foundation_ml = Column(String(20))
    lipstick_ml = Column(String(20))
    cost_of_makeup = Column(Integer)
    risk_level = Column(String(50))
    longevity = Column(String(50))
    luminance_bucket = Column(String(50))
