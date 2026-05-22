from fastapi import APIRouter

from app.core.response import success_response
from app.schemas.auth import AuthToken, LoginRequest, RegisterRequest, User, UserUpdateRequest
from app.schemas.common import RefreshTokenRequest, UserRole, UserStatus

router = APIRouter()

MOCK_TIME = "2026-05-19T10:00:00Z"


def mock_user() -> User:
    return User(
        id="user_demo_001",
        username="demo_student",
        role=UserRole.student,
        status=UserStatus.active,
        created_at=MOCK_TIME,
        updated_at=MOCK_TIME,
    )


def mock_token() -> AuthToken:
    return AuthToken(access_token="mock_access_token", refresh_token="mock_refresh_token", token_type="Bearer", expires_in=1440)


@router.post("/auth/register")
def register(payload: RegisterRequest):
    return success_response(mock_user())


@router.post("/auth/login")
def login(payload: LoginRequest):
    return success_response(mock_token())


@router.post("/auth/logout")
def logout():
    return success_response(True)


@router.post("/auth/refresh-token")
def refresh_token(payload: RefreshTokenRequest):
    return success_response(mock_token())


@router.get("/users/me")
def get_current_user():
    return success_response(mock_user())


@router.put("/users/me")
def update_current_user(payload: UserUpdateRequest):
    return success_response(mock_user())
