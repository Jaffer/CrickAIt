from fastapi import APIRouter, Depends, Request

from backend.app.schemas.auth_schemas import (
    RegisterRequest,
    GuestLoginRequest,
    LoginRequest,
    GoogleLoginRequest,
    ForgotPasswordRequest,
    VerifyOTPRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    UpdateProfileRequest
)
from backend.app.services.auth_service import AuthService
from backend.app.core.security import get_current_user, redis_client
from backend.app.core.redis_keys import RedisKeys

router = APIRouter(prefix="/auth", tags=["auth"])
auth_service = AuthService()

@router.post("/register")
async def register(request: RegisterRequest):
    return await auth_service.register(request)

@router.post("/guest")
async def guest_login(request: GuestLoginRequest):
    return await auth_service.guest_login(request)

@router.post("/login")
async def login(request: LoginRequest):
    return await auth_service.login(request)

@router.post("/google")
async def google_login(request: GoogleLoginRequest):
    return await auth_service.google_login(request)

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    return await auth_service.forgot_password(request)

@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    return await auth_service.verify_otp(request)

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    return await auth_service.reset_password(request)

@router.post("/change-password")
async def change_password(request: ChangePasswordRequest, username: str = Depends(get_current_user)):
    return await auth_service.change_password(request, username)

@router.post("/logout")
async def logout(request: Request):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        await redis_client.delete(RedisKeys.session(token))
    return {"status": "success"}

@router.get("/me")
async def get_me(username: str = Depends(get_current_user)):
    return await auth_service.get_me(username)

@router.patch("/me")
async def update_me(request: UpdateProfileRequest, username: str = Depends(get_current_user)):
    return await auth_service.update_me(request, username)

@router.delete("/delete-account")
async def delete_account(username: str = Depends(get_current_user)):
    return await auth_service.delete_account(username)
