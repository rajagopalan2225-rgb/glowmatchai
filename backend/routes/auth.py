"""
Auth route — works with or without a database.
If DB is unavailable, auth endpoints return 503 with a clear message.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import os
import bcrypt
from jose import JWTError, jwt
from dotenv import load_dotenv

from database import get_db, DB_AVAILABLE

load_dotenv()

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "local-dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

_NO_DB = HTTPException(
    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    detail="Database is not available in this environment. Auth features are disabled."
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: dict


# ─── Current-user dependency ─────────────────────────────────────────────────

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Optional[Session] = Depends(get_db)
):
    if not DB_AVAILABLE or db is None:
        raise _NO_DB
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    from models import User
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/register")
async def register(body: RegisterRequest, db: Optional[Session] = Depends(get_db)):
    if not DB_AVAILABLE or db is None:
        raise _NO_DB
    from models import User
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    new_user = User(
        email=body.email,
        password_hash=get_password_hash(body.password),
        full_name=body.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully", "user_id": new_user.id, "email": new_user.email}


@router.post("/login", response_model=Token)
async def login(body: LoginRequest, db: Optional[Session] = Depends(get_db)):
    if not DB_AVAILABLE or db is None:
        raise _NO_DB
    from models import User
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(data={"sub": user.email, "id": user.id}, expires_delta=expires)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": int(expires.total_seconds()),
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name}
    }


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    if not DB_AVAILABLE:
        raise _NO_DB
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "created_at": current_user.created_at
    }


@router.post("/logout")
async def logout(current_user=Depends(get_current_user)):
    if not DB_AVAILABLE:
        raise _NO_DB
    return {"message": "Logged out successfully"}
