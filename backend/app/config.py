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

    # Attacker VM
    ATTACKER_VM_HOST: str = "45.74.156.44"
    ATTACKER_VM_PRIVATE_IP: str = "10.0.0.12"
    ATTACKER_VM_USER: str = "ubuntu"
    ATTACKER_VM_SSH_PORT: int = 22
    ATTACKER_VM_SSH_KEY_PATH: str = ""

    # Victim VM
    VICTIM_VM_HOST: str = "45.74.156.43"
    VICTIM_VM_PRIVATE_IP: str = "10.0.0.11"
    VICTIM_VM_USER: str = "ubuntu"
    VICTIM_VM_SSH_PORT: int = 22
    VICTIM_VM_INTERFACE: str = "eth0"

    # Attack Simulation Configuration
    ATTACK_SIMULATION_ENABLED: bool = True
    ATTACK_SIMULATION_MAX_CONCURRENT: int = 1
    ATTACK_SIMULATION_TIMEOUT: int = 300
    ATTACK_SIMULATION_ALLOWED_TARGETS: str = "10.0.0.11"

    class Config:
        env_file = (".env", "backend/.env", "../.env")
        extra = "allow"

settings = Settings()
