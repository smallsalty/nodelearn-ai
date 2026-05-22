from typing import Literal

from app.schemas.common import ContractModel, UserRole, UserStatus


class User(ContractModel):
    id: str
    username: str
    email: str | None = None
    phone: str | None = None
    role: UserRole
    status: UserStatus
    avatar_url: str | None = None
    last_login_at: str | None = None
    created_at: str
    updated_at: str


class RegisterRequest(ContractModel):
    username: str
    password: str
    email: str | None = None
    phone: str | None = None
    role: UserRole


class LoginRequest(ContractModel):
    username: str
    password: str


class AuthToken(ContractModel):
    access_token: str
    refresh_token: str
    token_type: Literal["Bearer"]
    expires_in: int


class UserUpdateRequest(ContractModel):
    username: str | None = None
    email: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
