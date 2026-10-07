import os
import logging
import hashlib
import secrets
import smtplib
import httpx
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from backend.app.core.redis_keys import RedisKeys
from typing import Optional
from fastapi import Request, HTTPException
from redis.asyncio import Redis as AsyncRedis
from backend.app.config.settings import settings

logger = logging.getLogger("crickait-backend")

class SmartRedisClient:
    def __init__(self, redis_url: str):
        self.redis = AsyncRedis.from_url(redis_url)
        self.mock = None
        self.use_mock = False

    def _get_mock(self):
        if not self.mock:
            class MockRedis:
                def __init__(self):
                    self.data = {}
                    self.expirations = {}
                async def get(self, key: str):
                    import time
                    if key in self.expirations and self.expirations[key] < time.time():
                        self.data.pop(key, None)
                        self.expirations.pop(key, None)
                    val = self.data.get(key)
                    if val is None:
                        return None
                    return val if isinstance(val, bytes) else str(val).encode('utf-8')
                async def set(self, key: str, value: str, ex: int = None):
                    self.data[key] = value
                    if ex:
                        import time
                        self.expirations[key] = time.time() + ex
                async def incr(self, key: str):
                    import time
                    if key in self.expirations and self.expirations[key] < time.time():
                        self.data.pop(key, None)
                        self.expirations.pop(key, None)
                    val = int(self.data.get(key, 0)) + 1
                    self.data[key] = val
                    return val
                async def expire(self, key: str, seconds: int):
                    import time
                    self.expirations[key] = time.time() + seconds
                    return 1
                async def delete(self, key: str):
                    self.data.pop(key, None)
                    self.expirations.pop(key, None)
                    return 1
            self.mock = MockRedis()
        return self.mock

    async def get(self, key: str):
        if self.use_mock:
            return await self._get_mock().get(key)
        try:
            return await self.redis.get(key)
        except Exception as e:
            logger.warning("Redis connection failed on get, falling back to mock: %s", e)
            self.use_mock = True
            return await self._get_mock().get(key)

    async def set(self, key: str, value: str, ex: int = None):
        if self.use_mock:
            return await self._get_mock().set(key, value, ex)
        try:
            return await self.redis.set(key, value, ex=ex)
        except Exception as e:
            logger.warning("Redis connection failed on set, falling back to mock: %s", e)
            self.use_mock = True
            return await self._get_mock().set(key, value, ex)

    async def setex(self, key: str, seconds: int, value: str):
        return await self.set(key, value, ex=seconds)

    async def incr(self, key: str):
        if self.use_mock:
            return await self._get_mock().incr(key)
        try:
            return await self.redis.incr(key)
        except Exception as e:
            logger.warning("Redis connection failed on incr, falling back to mock: %s", e)
            self.use_mock = True
            return await self._get_mock().incr(key)

    async def expire(self, key: str, seconds: int):
        if self.use_mock:
            return await self._get_mock().expire(key, seconds)
        try:
            return await self.redis.expire(key, seconds)
        except Exception as e:
            logger.warning("Redis connection failed on expire, falling back to mock: %s", e)
            self.use_mock = True
            return await self._get_mock().expire(key, seconds)

    async def delete(self, key: str):
        if self.use_mock:
            return await self._get_mock().delete(key)
        try:
            return await self.redis.delete(key)
        except Exception as e:
            logger.warning("Redis connection failed on delete, falling back to mock: %s", e)
            self.use_mock = True
            return await self._get_mock().delete(key)

redis_client = SmartRedisClient(settings.REDIS_URL)

_http_client: Optional[httpx.AsyncClient] = None
_http_client_loop: Optional[asyncio.AbstractEventLoop] = None

def get_http_client() -> httpx.AsyncClient:
    global _http_client, _http_client_loop
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if _http_client is None or _http_client_loop != current_loop:
        _http_client = httpx.AsyncClient(
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=httpx.Timeout(10.0, connect=3.0)
        )
        _http_client_loop = current_loop
    return _http_client

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}:{key.hex()}"

def verify_password(stored_password: str, provided_password: str) -> bool:
    try:
        salt, key_hex = stored_password.split(':')
        key = hashlib.pbkdf2_hmac(
            'sha256',
            provided_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return key.hex() == key_hex
    except Exception:
        return False

def generate_otp() -> str:
    """Generate a 6-digit numeric OTP."""
    return ''.join(secrets.choice('0123456789') for _ in range(6))

async def send_otp_email(to_email: str, otp: str, purpose: str = "password reset") -> bool:
    """Send an OTP email. Returns True on success, False on failure."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — OTP email not sent to %s. OTP is: %s", to_email, otp)
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"CrickAIt - Your {purpose.title()} Code"
        msg['From'] = settings.SMTP_FROM
        msg['To'] = to_email

        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #10a37f; margin: 0;">CrickAIt</h2>
            </div>
            <div style="background: #1a1d24; border-radius: 12px; padding: 32px; text-align: center;">
                <h3 style="color: #f1f1f1; margin-bottom: 8px;">Your Verification Code</h3>
                <p style="color: #a0aab2; font-size: 14px; margin-bottom: 24px;">
                    Use the code below to {purpose}. It expires in 10 minutes.
                </p>
                <div style="background: #252932; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <span style="font-size: 32px; font-weight: bold; color: #10a37f; letter-spacing: 8px;">{otp}</span>
                </div>
                <p style="color: #a0aab2; font-size: 12px;">
                    If you didn't request this, you can safely ignore this email.
                </p>
            </div>
            <p style="text-align: center; color: #636e72; font-size: 11px; margin-top: 16px;">
                © {datetime.now().year} CrickAIt. All rights reserved.
            </p>
        </div>
        """

        text_body = f"CrickAIt — Your {purpose.title()} Code\n\nYour verification code is: {otp}\nIt expires in 10 minutes.\n\nIf you didn't request this, ignore this email."

        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())

        logger.info("OTP email sent to %s for %s", to_email, purpose)
        return True
    except Exception as e:
        logger.error("Failed to send OTP email to %s: %s", to_email, e)
        return False

async def verify_turnstile(token: Optional[str]) -> bool:
    if not settings.TURNSTILE_SECRET_KEY:
        logger.warning("TURNSTILE_SECRET_KEY not set. Bypassing Turnstile verification.")
        return True
    if not token:
        logger.warning("Turnstile token missing.")
        return False
    url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    payload = {
        "secret": settings.TURNSTILE_SECRET_KEY,
        "response": token,
    }
    try:
        client = get_http_client()
        res = await client.post(url, data=payload, timeout=5.0)
        data = res.json()
        return data.get("success", False)
    except Exception as e:
        logger.error("Turnstile network verification failed: %s", e)
        return False

async def get_current_user(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication token missing or invalid"
        )
    token = auth_header.split(" ")[1]
    username_bytes = await redis_client.get(RedisKeys.session(token))
    if not username_bytes:
        raise HTTPException(
            status_code=401,
            detail="Session expired or invalid"
        )
    return username_bytes.decode('utf-8')

async def get_current_user_optional(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    username_bytes = await redis_client.get(RedisKeys.session(token))
    if not username_bytes:
        return None
    return username_bytes.decode('utf-8')
