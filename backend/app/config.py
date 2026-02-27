from functools import lru_cache
from typing import List, Literal

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings


PlanName = Literal["free", "pro", "enterprise"]


class Settings(BaseSettings):
    app_name: str = Field("Multi-Tenant AI SaaS", alias="APP_NAME")
    app_env: str = Field("development", alias="APP_ENV")
    app_host: str = Field("0.0.0.0", alias="APP_HOST")
    app_port: int = Field(8000, alias="APP_PORT")

    jwt_secret: str = Field(..., alias="JWT_SECRET")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(15, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(7, alias="REFRESH_TOKEN_EXPIRE_DAYS")

    database_url: str = Field(..., alias="DATABASE_URL")
    redis_url: str = Field(..., alias="REDIS_URL")

    stripe_secret_key: str = Field(..., alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(..., alias="STRIPE_WEBHOOK_SECRET")
    stripe_price_free: str = Field("", alias="STRIPE_PRICE_FREE")
    stripe_price_pro_monthly: str = Field(..., alias="STRIPE_PRICE_PRO_MONTHLY")
    stripe_price_enterprise_monthly: str = Field(..., alias="STRIPE_PRICE_ENTERPRISE_MONTHLY")
    stripe_customer_portal_return_url: str = Field(..., alias="STRIPE_CUSTOMER_PORTAL_RETURN_URL")

    groq_api_key: str = Field(..., alias="GROQ_API_KEY")
    chroma_persist_directory: str = Field("chroma_db", alias="CHROMA_PERSIST_DIRECTORY")

    frontend_origin: AnyHttpUrl = Field("http://localhost:5173", alias="FRONTEND_ORIGIN")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[arg-type]


PLAN_LIMITS = {
    "free": {
        "max_users": 1,
        "max_ai_queries": 50,
        "max_documents": 5,
        "conversation_history": False,
        "audit_log": False,
        "model": "llama-3.1-8b-instant",
        "priority_queue": False,
    },
    "pro": {
        "max_users": 5,
        "max_ai_queries": 500,
        "max_documents": None,
        "conversation_history": True,
        "audit_log": True,
        "model": "llama-3.1-8b-instant",
        "priority_queue": False,
    },
    "enterprise": {
        "max_users": None,
        "max_ai_queries": None,
        "max_documents": None,
        "conversation_history": True,
        "audit_log": True,
        "model": "llama-3.3-70b-versatile",
        "priority_queue": True,
    },
}


def get_plan_limits(plan: PlanName) -> dict:
    return PLAN_LIMITS[plan]

