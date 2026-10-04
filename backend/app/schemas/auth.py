from typing import Optional
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = ""
    role: Optional[str] = "SOC_ANALYST"  # ADMIN, SOC_ANALYST, VIEWER


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserProfile(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str] = ""
    role: str
    is_active: bool

    class Config:
        from_attributes = True
