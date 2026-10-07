from pydantic import BaseModel
from typing import Optional

class GuestLoginRequest(BaseModel):
    device_id: Optional[str] = None

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    turnstile_token: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str
    turnstile_token: Optional[str] = None

class GoogleLoginRequest(BaseModel):
    email: str
    display_name: str

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    avatar: Optional[str] = None
