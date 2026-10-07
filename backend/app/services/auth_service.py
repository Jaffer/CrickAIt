import re
import uuid
import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException

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
from backend.app.repositories.user_repository import UserRepository
from backend.app.core.security import (
    redis_client,
    hash_password,
    verify_password,
    generate_otp,
    send_otp_email,
    verify_turnstile
)
from backend.app.core.base_service import BaseService
from backend.app.core.redis_keys import RedisKeys

class AuthService(BaseService):
    def __init__(self, user_repo: Optional[UserRepository] = None):
        super().__init__("crickait-backend")
        self.user_repo = user_repo or UserRepository()

    async def register(self, request: RegisterRequest) -> dict:
        # Verify CAPTCHA
        if not await verify_turnstile(request.turnstile_token):
            raise HTTPException(
                status_code=400,
                detail="Security CAPTCHA verification failed. Please try again."
            )

        username = request.username.strip().lower()
        email = request.email.strip().lower()
        password = request.password

        self.validate_condition(
            bool(username and email and password),
            detail="Username, email, and password are required"
        )

        self.validate_condition(
            bool(re.match(r'^[a-zA-Z0-9\-_]+$', username)),
            detail="Username can only contain alphanumeric characters, hyphens, and underscores"
        )

        # Validate email
        self.validate_condition(
            bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email)),
            detail="Please enter a valid email address"
        )

        self.validate_condition(
            len(password) >= 8,
            detail="Password must be at least 8 characters long"
        )
        self.validate_condition(
            any(c.isalpha() for c in password) and any(c.isdigit() for c in password),
            detail="Password must contain at least one letter and one number"
        )
        special_chars = set("!@#$%^&*()_+-=[]{}|;':\",./<>?\\~`")
        self.validate_condition(
            any(c in special_chars for c in password),
            detail="Password must contain at least one special character"
        )

        try:
            self.validate_condition(
                username != 'iamthecreator',
                detail="Reserved username. Please login instead."
            )

            # Check if username exists
            if await self.user_repo.get_user_by_username(username):
                raise HTTPException(
                    status_code=400,
                    detail="Username is already taken"
                )
            
            # Check if email exists
            if await self.user_repo.get_user_by_email(email):
                raise HTTPException(
                    status_code=400,
                    detail="Email is already registered"
                )

            plan = 'pro' if username in ('admin', 'creator') or email in ('admin@crickait.com', 'creator@crickait.com') else 'free'
            pwd_hash = hash_password(password)
            await self.user_repo.create_user(
                username=username,
                email=email,
                password_hash=pwd_hash,
                auth_provider='local',
                display_name=request.username,
                plan=plan
            )

            # Save persistent backup to Redis
            redis_user = {
                "username": username,
                "email": email,
                "password_hash": pwd_hash,
                "auth_provider": "local",
                "display_name": request.username,
                "plan": plan,
                "avatar": None
            }
            await redis_client.set(RedisKeys.user_account(username), json.dumps(redis_user))
            await redis_client.set(RedisKeys.user_email(email), username)
        except Exception as e:
            self.handle_error("Registration database", e, detail="Database error during registration")

        # Generate token
        token = uuid.uuid4().hex
        await redis_client.setex(RedisKeys.session(token), 86400, username)
        return {
            "token": token,
            "username": username,
            "display_name": request.username
        }

    async def guest_login(self, request: GuestLoginRequest) -> dict:
        dev_id = request.device_id or ""
        device_id = re.sub(r'[^a-zA-Z0-9\-_]', '', dev_id)
        if not device_id:
            device_id = uuid.uuid4().hex[:8]
        username = f"guest_{device_id}"
        token = uuid.uuid4().hex
        await redis_client.setex(RedisKeys.session(token), 86400, username)
        # Save guest profile explicitly
        guest_profile = {
            "favorite_players": [],
            "favorite_teams": [],
            "expertise_level": "Casual",
            "preferred_format": ["T20"],
            "rival_teams": []
        }
        await redis_client.setex(RedisKeys.global_user_profile(username), 86400, json.dumps(guest_profile))
        return {
            "token": token,
            "username": username,
            "display_name": "Guest User"
        }

    async def login(self, request: LoginRequest) -> dict:
        # Verify CAPTCHA
        if not await verify_turnstile(request.turnstile_token):
            raise HTTPException(
                status_code=400,
                detail="Security CAPTCHA verification failed. Please try again."
            )

        username = request.username.strip().lower()
        password = request.password

        try:
            # Check Redis persistent fallback first to restore user if SQLite was wiped
            redis_data = await redis_client.get(RedisKeys.user_account(username))
            if "@" in username:
                resolved_username = await redis_client.get(RedisKeys.user_email(username))
                if resolved_username:
                    username_str = resolved_username.decode('utf-8') if isinstance(resolved_username, bytes) else resolved_username
                    redis_data = await redis_client.get(RedisKeys.user_account(username_str))
            
            if redis_data:
                redis_data_str = redis_data.decode('utf-8') if isinstance(redis_data, bytes) else redis_data
                user_data = json.loads(redis_data_str)
                avatar_val = user_data.get("avatar", None)
                await self.user_repo.restore_user(
                    username=user_data["username"],
                    email=user_data["email"],
                    password_hash=user_data["password_hash"],
                    auth_provider=user_data["auth_provider"],
                    display_name=user_data["display_name"],
                    plan=user_data["plan"],
                    avatar=avatar_val
                )
        except Exception as re_err:
            self.logger.error("Failed to restore local user from Redis fallback: %s", re_err)

        try:
            row = await self.user_repo.get_user_by_username_or_email(username)
            if not row:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid username or password"
                )

            if row["auth_provider"] != "local":
                raise HTTPException(
                    status_code=400,
                    detail="This account is registered via Google login"
                )

            if not verify_password(row["password_hash"], password):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid username or password"
                )

            username = row["username"]
            display_name = row["display_name"] or row["username"]
        except Exception as e:
            self.handle_error("Login database", e, detail="Database error during login")

        token = uuid.uuid4().hex
        await redis_client.setex(RedisKeys.session(token), 86400, username)
        return {"token": token, "username": username, "display_name": display_name}

    async def google_login(self, request: GoogleLoginRequest) -> dict:
        email = request.email.strip().lower()
        display_name = request.display_name.strip()

        self.validate_condition(bool(email), detail="Email is required")

        # Generate username from email
        base_username = email.split("@")[0]
        base_username = re.sub(r'[^a-zA-Z0-9\-_]', '', base_username)
        if not base_username:
            base_username = "google_user"

        username = base_username
        try:
            # Check Redis persistent fallback first to restore user if SQLite was wiped
            username_from_redis = await redis_client.get(RedisKeys.user_email(email))
            if username_from_redis:
                username_str = username_from_redis.decode('utf-8') if isinstance(username_from_redis, bytes) else username_from_redis
                redis_data = await redis_client.get(RedisKeys.user_account(username_str))
                if redis_data:
                    redis_data_str = redis_data.decode('utf-8') if isinstance(redis_data, bytes) else redis_data
                    user_data = json.loads(redis_data_str)
                    avatar_val = user_data.get("avatar", None)
                    await self.user_repo.restore_user(
                        username=user_data["username"],
                        email=user_data["email"],
                        password_hash=user_data["password_hash"],
                        auth_provider=user_data["auth_provider"],
                        display_name=user_data["display_name"],
                        plan=user_data["plan"],
                        avatar=avatar_val
                    )
        except Exception as re_err:
            self.logger.error("Failed to restore Google user from Redis fallback: %s", re_err)

        try:
            # Check if user already exists
            row = await self.user_repo.get_user_by_email(email)
            if row:
                username = row["username"]
                display_name = row["display_name"] or display_name
            else:
                # Resolve username conflicts
                counter = 1
                while True:
                    if not await self.user_repo.get_user_by_username(username):
                        break
                    username = f"{base_username}_{counter}"
                    counter += 1

                plan = 'pro' if username in ('admin', 'creator') or email in ('admin@crickait.com', 'creator@crickait.com') else 'free'
                await self.user_repo.create_user(
                    username=username,
                    email=email,
                    password_hash=None,
                    auth_provider='google',
                    display_name=display_name,
                    plan=plan
                )

                # Save persistent backup to Redis
                redis_user = {
                    "username": username,
                    "email": email,
                    "password_hash": None,
                    "auth_provider": "google",
                    "display_name": display_name,
                    "plan": plan,
                    "avatar": None
                }
                await redis_client.set(RedisKeys.user_account(username), json.dumps(redis_user))
                await redis_client.set(RedisKeys.user_email(email), username)
        except Exception as e:
            self.handle_error("Google login database", e, detail="Database error during Google login")

        token = uuid.uuid4().hex
        await redis_client.setex(RedisKeys.session(token), 86400, username)
        return {"token": token, "username": username, "display_name": display_name}

    async def forgot_password(self, request: ForgotPasswordRequest) -> dict:
        """Send an OTP to the user's email for password reset."""
        email = request.email.strip().lower()
        self.validate_condition(
            bool(email and re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email)),
            detail="Please enter a valid email address"
        )

        try:
            row = await self.user_repo.get_user_by_email(email)
            if not row or row["auth_provider"] != "local":
                # Return success even if email not found or not local to prevent enumeration
                return {"message": "If an account with that email exists, a verification code has been sent."}

            # Invalidate any previous unused OTPs for this email
            await self.user_repo.invalidate_password_resets(email)

            otp = generate_otp()
            expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
            await self.user_repo.create_password_reset(email, otp, expires_at)

            sent = await send_otp_email(email, otp, purpose="password reset")
            if not sent:
                self.logger.warning("SMTP not configured — OTP for %s is: %s", email, otp)

        except Exception as e:
            self.handle_error("Forgot password", e, detail="An error occurred. Please try again.")

        return {"message": "If an account with that email exists, a verification code has been sent."}

    async def verify_otp(self, request: VerifyOTPRequest) -> dict:
        """Verify the OTP sent to the user's email."""
        email = request.email.strip().lower()
        otp = request.otp.strip()

        self.validate_condition(bool(email and otp), detail="Email and OTP are required")

        try:
            row = await self.user_repo.get_unused_password_reset(email, otp)
            if not row:
                raise HTTPException(status_code=400, detail="Invalid or expired verification code")

            expires_at = datetime.fromisoformat(row["expires_at"])
            self.validate_condition(
                datetime.utcnow() <= expires_at,
                detail="Verification code has expired. Please request a new one."
            )

        except Exception as e:
            self.handle_error("Verify OTP", e, detail="An error occurred. Please try again.")

        return {"message": "Verification code is valid", "email": email}

    async def reset_password(self, request: ResetPasswordRequest) -> dict:
        """Reset password using verified OTP."""
        email = request.email.strip().lower()
        otp = request.otp.strip()
        new_password = request.new_password

        self.validate_condition(bool(email and otp and new_password), detail="Email, OTP, and new password are required")

        self.validate_condition(len(new_password) >= 8, detail="Password must be at least 8 characters long")
        self.validate_condition(
            any(c.isalpha() for c in new_password) and any(c.isdigit() for c in new_password),
            detail="Password must contain at least one letter and one number"
        )
        special_chars = set("!@#$%^&*()_+-=[]{}|;':\",./<>?\\~`")
        self.validate_condition(
            any(c in special_chars for c in new_password),
            detail="Password must contain at least one special character"
        )

        try:
            row = await self.user_repo.get_unused_password_reset(email, otp)
            if not row:
                raise HTTPException(status_code=400, detail="Invalid or expired verification code")

            expires_at = datetime.fromisoformat(row["expires_at"])
            self.validate_condition(
                datetime.utcnow() <= expires_at,
                detail="Verification code has expired. Please request a new one."
            )

            # Mark OTP as used
            await self.user_repo.mark_password_reset_used(row["id"])

            # Update password
            new_hash = hash_password(new_password)
            await self.user_repo.update_user_password(email, new_hash, is_email=True)

            # Update Redis cache
            redis_data = await redis_client.get(RedisKeys.user_email(email))
            if redis_data:
                username_str = redis_data.decode('utf-8') if isinstance(redis_data, bytes) else redis_data
                account_data = await redis_client.get(RedisKeys.user_account(username_str))
                if account_data:
                    user_data = json.loads(account_data.decode('utf-8') if isinstance(account_data, bytes) else account_data)
                    user_data["password_hash"] = new_hash
                    await redis_client.set(RedisKeys.user_account(username_str), json.dumps(user_data))

        except Exception as e:
            self.handle_error("Reset password", e, detail="An error occurred. Please try again.")

        return {"message": "Password has been reset successfully. You can now sign in with your new password."}

    async def change_password(self, request: ChangePasswordRequest, username: str) -> dict:
        """Change password for logged-in users (requires current password)."""
        self.validate_condition(not username.startswith('guest_'), detail="Guest accounts cannot change password")

        self.validate_condition(len(request.new_password) >= 8, detail="New password must be at least 8 characters long")
        self.validate_condition(
            any(c.isalpha() for c in request.new_password) and any(c.isdigit() for c in request.new_password),
            detail="New password must contain at least one letter and one number"
        )
        special_chars = set("!@#$%^&*()_+-=[]{}|;':\",./<>?\\~`")
        self.validate_condition(
            any(c in special_chars for c in request.new_password),
            detail="New password must contain at least one special character"
        )

        try:
            row = await self.user_repo.get_user_by_username(username)
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            self.validate_condition(
                row["auth_provider"] == "local",
                detail="Password change not available for Google-linked accounts"
            )
            self.validate_condition(
                verify_password(row["password_hash"], request.current_password),
                detail="Current password is incorrect"
            )

            new_hash = hash_password(request.new_password)
            await self.user_repo.update_user_password(username, new_hash, is_email=False)

            # Update Redis cache
            account_data = await redis_client.get(RedisKeys.user_account(username))
            if account_data:
                user_data = json.loads(account_data.decode('utf-8') if isinstance(account_data, bytes) else account_data)
                user_data["password_hash"] = new_hash
                await redis_client.set(RedisKeys.user_account(username), json.dumps(user_data))

        except Exception as e:
            self.handle_error("Change password", e, detail="An error occurred. Please try again.")

        return {"message": "Password changed successfully"}

    async def get_me(self, username: str) -> dict:
        if username.startswith('guest_'):
            return {
                "username": username,
                "email": "guest@crickait.com",
                "display_name": "Guest User",
                "plan": "guest",
                "avatar": None
            }
        try:
            row = await self.user_repo.get_user_by_username(username)
            if row:
                return {
                    "username": row["username"],
                    "email": row["email"],
                    "display_name": row["display_name"],
                    "plan": row["plan"],
                    "avatar": row["avatar"]
                }
            raise HTTPException(status_code=404, detail="User not found")
        except Exception as e:
            self.handle_error("Fetch user profile", e, detail="Database error")

    async def update_me(self, request: UpdateProfileRequest, username: str) -> dict:
        self.validate_condition(
            not username.startswith('guest_'),
            status_code=403,
            detail="Guests cannot update profile details. Please sign up."
        )
        
        try:
            display_name = request.display_name
            avatar = request.avatar
            
            if display_name is None and avatar is None:
                return {"status": "success"}

            await self.user_repo.update_user_profile(username, display_name, avatar)
            
            # Update Redis cache
            redis_data_str = await redis_client.get(RedisKeys.user_account(username))
            if redis_data_str:
                redis_data_str = redis_data_str.decode('utf-8') if isinstance(redis_data_str, bytes) else redis_data_str
                user_data = json.loads(redis_data_str)
                if display_name is not None:
                    user_data["display_name"] = display_name.strip()
                if avatar is not None:
                    user_data["avatar"] = avatar
                await redis_client.set(RedisKeys.user_account(username), json.dumps(user_data))
                
            return {"status": "success"}
        except Exception as e:
            self.handle_error("Update user profile", e, detail="Database error")

    async def delete_account(self, username: str) -> dict:
        try:
            await self.user_repo.delete_user(username)
            # Clean Redis
            await redis_client.delete(RedisKeys.global_user_profile(username))
            await redis_client.delete(RedisKeys.chat_names(username))
        except Exception as e:
            self.handle_error("Delete account", e, detail="Failed to delete account")

        return {"status": "success"}
