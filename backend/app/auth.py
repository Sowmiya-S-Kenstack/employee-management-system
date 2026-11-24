
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from .database import get_db
from .models import User
from .schemas import UserRegister, UserLogin
from .security import (
    password_hash,
    verify_password,
    create_access_token,
    get_current_user_id
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

bearer_scheme = HTTPBearer()


# MODULE 1: USER REGISTRATION
@router.post("/register", status_code=201)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="This email address is already registered"
        )

    hashed_password = password_hash.hash(user_data.password)

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        mobile_number=user_data.mobile_number,
        password_hash=hashed_password
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This email address is already registered"
        )

    return {
        "success": True,
        "message": "User registered successfully!",
        "user": {
            "user_id": new_user.user_id,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "mobile_number": new_user.mobile_number
        }
    }


# MODULE 2: USER LOGIN
@router.post("/login")
def login_user(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if not user or not verify_password(
        user_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token(user.user_id)

    return {
        "success": True,
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "full_name": user.full_name,
            "email": user.email
        }
    }


# MODULE 2: PROTECTED USER DETAILS
@router.get("/me")
def get_logged_in_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_current_user_id(credentials.credentials)

    user = db.query(User).filter(
        User.user_id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found"
        )

    return {
        "user_id": user.user_id,
        "full_name": user.full_name,
        "email": user.email
    }
