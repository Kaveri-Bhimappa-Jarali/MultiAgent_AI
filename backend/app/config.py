from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Multi-Agent AI Security Operations Center (SOC)"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "SOC_ENTERPRISE_ROYAL_SECRET_KEY_CHANGE_IN_PRODUCTION_9921"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    DEFAULT_ADMIN_PASSWORD: str = "Admin@SOC2026!"
    DEFAULT_ANALYST_PASSWORD: str = "Analyst@SOC2026!"
    
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
        "http://192.168.56.1:5173",
        "http://192.168.56.1:8000",
        "http://192.168.56.10:3000",
        "http://192.168.56.15:3000",
        "http://192.168.56.20:3000",
        "*"
    ]
    
    # LLM Settings (optional - graceful fallback provided)
    LLM_PROVIDER: str = "local"  # "local", "gemini", "openai"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    
    # SOC Engine
    DEMO_MODE_DEFAULT: bool = True
    DEFAULT_RISK_THRESHOLD_AUTO_CONTAIN: int = 85

    # SOC Network & VM Integration
    SOC_HOST_IP: str = os.environ.get("SOC_HOST_IP", "192.168.56.1")
    SOC_HOST_PORT: int = int(os.environ.get("SOC_HOST_PORT", "8000"))
    SYSLOG_LISTEN_HOST: str = os.environ.get("SYSLOG_LISTEN_HOST", "0.0.0.0")
    SYSLOG_LISTEN_PORT: int = int(os.environ.get("SYSLOG_LISTEN_PORT", "5514"))
    ALLOWED_LAB_SUBNETS: str = os.environ.get("ALLOWED_LAB_SUBNETS", "192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,127.0.0.0/8")
    CORRELATION_WINDOW_SECONDS: int = int(os.environ.get("CORRELATION_WINDOW_SECONDS", "900"))

    # Attacker VM
    ATTACKER_VM_HOST: str = os.environ.get("ATTACKER_VM_HOST", "45.74.156.41")
    ATTACKER_VM_PRIVATE_IP: str = os.environ.get("ATTACKER_VM_PRIVATE_IP", "10.0.0.13")
    ATTACKER_VM_USER: str = os.environ.get("ATTACKER_VM_USER", "ubuntu")
    ATTACKER_VM_SSH_PORT: int = int(os.environ.get("ATTACKER_VM_SSH_PORT", "22"))
    ATTACKER_VM_SSH_KEY_PATH: str = os.environ.get("ATTACKER_VM_SSH_KEY_PATH", "C:/Users/VICTUS/.ssh/soc_lab")

    # Victim VM
    VICTIM_VM_HOST: str = os.environ.get("VICTIM_VM_HOST", "45.74.156.44")
    VICTIM_VM_PRIVATE_IP: str = os.environ.get("VICTIM_VM_PRIVATE_IP", "10.0.0.12")
    VICTIM_VM_USER: str = os.environ.get("VICTIM_VM_USER", "ubuntu")
    VICTIM_VM_SSH_PORT: int = int(os.environ.get("VICTIM_VM_SSH_PORT", "22"))
    VICTIM_VM_SSH_KEY_PATH: str = os.environ.get("VICTIM_VM_SSH_KEY_PATH", "C:/Users/VICTUS/.ssh/soc_lab")
    VICTIM_VM_INTERFACE: str = os.environ.get("VICTIM_VM_INTERFACE", "eth0")

    # Attack Simulation Configuration
    ATTACK_SIMULATION_ENABLED: bool = True
    ATTACK_SIMULATION_MAX_CONCURRENT: int = 1
    ATTACK_SIMULATION_TIMEOUT: int = 300
    ATTACK_SIMULATION_ALLOWED_TARGETS: str = os.environ.get("ATTACK_SIMULATION_ALLOWED_TARGETS", "10.0.0.12,10.0.0.13,10.0.0.11,192.168.56.15,192.168.56.10")

    class Config:
        env_file = (".env", "backend/.env", "../.env")
        extra = "allow"

settings = Settings()
