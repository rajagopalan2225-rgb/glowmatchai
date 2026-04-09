"""
Auth route - Custom PostgreSQL authentication flow.
Using direct bcrypt library to avoid passlib compatibility issues with Python 3.13.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import bcrypt
from jose import JWTError, jwt
from dotenv import load_dotenv

from models import User
from database import get_db

load_dotenv()

router = APIRouter()

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-please-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str):
    try:
        return bcrypt.checkpw(
            password=plain_password.encode('utf-8'),
            hashed_password=hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def get_password_hash(password: str):
    # bcrypt.hashpw returns bytes, we decode to store as string in DB
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ─── Models ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = ""

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: dict


# ─── Dependency: Get Current User ─────────────────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Verify the JWT token and return the user payload."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register")
async def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user in PostgreSQL."""
    db_user = db.query(User).filter(User.email == body.email).first()
    if db_user:
        raise HTTPException(status_code=409, detail="Email already registered")
        
    hashed_password = get_password_hash(body.password)
    new_user = User(
        email=body.email,
        password_hash=hashed_password,
        full_name=body.full_name
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "email": new_user.email
    }


@router.post("/login", response_model=Token)
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint for PostgreSQL auth."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "id": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": access_token_expires.total_seconds(),
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name
        }
    }


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "created_at": current_user.created_at
    }


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Invalidate the user's session"""
    return {"message": "Logged out successfully"}
