import os
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except ImportError:
    pass

class Settings:
    CRICKET_API_KEY: str = os.getenv("CRICKET_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "CrickAIt <noreply@crickait.com>")
    TURNSTILE_SECRET_KEY: str = os.getenv("TURNSTILE_SECRET_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/crickait")
    GROQ_ROUTER_MODEL: str = os.getenv("GROQ_ROUTER_MODEL", "qwen/qwen3.8-27b")
    GROQ_EXPERT_MODEL: str = os.getenv("GROQ_EXPERT_MODEL", "qwen/qwen3.8-27b")
settings = Settings()

if not settings.GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY environment variable is not set")
