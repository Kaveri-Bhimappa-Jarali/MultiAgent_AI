from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.models.user import User
from app.services.auth_service import verify_password, create_access_token, get_current_user
from app.services.audit_service import log_audit_entry

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == creds.username).first()
    if not user or not verify_password(creds.password, user.hashed_password):
        log_audit_entry(
            db,
            actor=creds.username,
            action="LOGIN_FAILED",
            target_type="USER",
            status="FAILED"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    log_audit_entry(
        db,
        actor=user.username,
        action="USER_LOGIN",
        target_type="USER",
        target_id=str(user.id),
        status="SUCCESS"
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log_audit_entry(
        db,
        actor=current_user.username,
        action="USER_LOGOUT",
        target_type="USER",
        target_id=str(current_user.id)
    )
    return {"message": "Logged out successfully"}
