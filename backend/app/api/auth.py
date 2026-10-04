from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import get_settings
from backend.app.database.database import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserProfile
from backend.app.services.audit_service import AuditService

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8") if isinstance(hashed_password, str) else hashed_password,
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency extracting and validating JWT bearer token."""
    jwt_token = token
    if not jwt_token and authorization and authorization.startswith("Bearer "):
        jwt_token = authorization.split(" ")[1]

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not jwt_token:
        raise credentials_exception

    try:
        payload = jwt.decode(jwt_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Check for admin
    if settings.ADMIN_USERNAME and username == settings.ADMIN_USERNAME:
        # Create a mock User object using dictionary access if it's a dict or simple object
        # Since this returns a SQLAlchemy model usually, we might need a dummy object
        class DummyAdmin:
            id = "admin-001"
            username = settings.ADMIN_USERNAME
            role = "ADMIN"
            is_active = True
            
            def to_dict(self):
                return {
                    "id": self.id,
                    "username": self.username,
                    "role": self.role,
                    "is_active": self.is_active,
                    "email": "admin@aegissim.local",
                    "full_name": "System Administrator",
                }
                
        return DummyAdmin()

    stmt = select(User).where(User.username == username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_role(allowed_roles: list[str]):
    """RBAC dependency ensuring the authenticated user has sufficient role permissions."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {allowed_roles}",
            )
        return current_user
    return role_checker


@router.post("/register", response_model=TokenResponse)
async def register_user(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    """Registers a new SOC platform user."""
    stmt = select(User).where((User.username == payload.username) | (User.email == payload.email))
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username or email is already registered.")

    hashed_pw = get_password_hash(payload.password)
    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hashed_pw,
        role=payload.role or "SOC_ANALYST",
        full_name=payload.full_name or "",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    token = create_access_token(data={"sub": user.username, "role": user.role})
    await AuditService.log_action(
        session=db,
        actor_username=user.username,
        action="register",
        resource_type="user",
        resource_id=user.id,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict(),
    }


@router.post("/login", response_model=TokenResponse)
async def login_user(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticates user with username & password."""
    # Hardcoded check to bypass DB when running without Docker
    if settings.ADMIN_USERNAME and payload.username == settings.ADMIN_USERNAME and payload.password == settings.ADMIN_PASSWORD:
        token = create_access_token(data={"sub": settings.ADMIN_USERNAME, "role": "ADMIN"})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": "admin-001",
                "username": settings.ADMIN_USERNAME,
                "email": "admin@aegissim.local",
                "full_name": "System Administrator",
                "role": "ADMIN",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
        }

    stmt = select(User).where(User.username == payload.username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is deactivated.")

    token = create_access_token(data={"sub": user.username, "role": user.role})
    await AuditService.log_action(
        session=db,
        actor_username=user.username,
        action="login",
        resource_type="user",
        resource_id=user.id,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict(),
    }


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    return current_user
