from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Multi-Agent AI Security Operations Center (SOC)"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "SOC_ENTERPRISE_ROYAL_SECRET_KEY_CHANGE_IN_PRODUCTION_9921"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = "sqlite:///./soc_enterprise.db"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    # LLM Settings (optional - graceful fallback provided)
    LLM_PROVIDER: str = "local"  # "local", "gemini", "openai"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    
    # SOC Engine
    DEMO_MODE_DEFAULT: bool = True
    DEFAULT_RISK_THRESHOLD_AUTO_CONTAIN: int = 85
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
