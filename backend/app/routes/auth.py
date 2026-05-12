from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

import bcrypt as _bcrypt

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, field_validator

from app.auth import create_token, get_current_user_id, require_user
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return _bcrypt.checkpw(password.encode(), hashed.encode())


BUNDLES = {
    "priority": {"tokens": 25,   "price_usd": 9.0,  "label": "Priority Pass"},
    "creator":  {"tokens": 100,  "price_usd": 19.0, "label": "Creator"},
    "pro":      {"tokens": 1000, "price_usd": 49.0, "label": "Pro"},
    "extra50":  {"tokens": 50,   "price_usd": 9.0,  "label": "50 extra tokens"},
    "extra200": {"tokens": 200,  "price_usd": 29.0, "label": "200 extra tokens"},
}

TOKEN_COSTS = {"1080p": 10, "4k": 25}


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def valid_email(cls, v: str) -> str:
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", v.strip()):
            raise ValueError("Invalid email")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: "UserOut"


class UserOut(BaseModel):
    id: str
    email: str
    token_balance: int
    created_at: Optional[str] = None


class BuyRequest(BaseModel):
    bundle: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class PurchaseOut(BaseModel):
    id: str
    tokens: int
    price_usd: float
    label: str
    created_at: str


class UsageOut(BaseModel):
    id: str
    job_id: str
    tokens: int
    quality: str
    created_at: str


class StatsOut(BaseModel):
    total_renders: int
    tokens_purchased: int
    tokens_spent: int


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user_by_id(user_id: str) -> Optional[dict]:
    row = get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def _get_user_by_email(email: str) -> Optional[dict]:
    row = get_db().execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    return dict(row) if row else None


# ── Auth endpoints ────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=201)
def register(body: RegisterRequest):
    if _get_user_by_email(body.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user_id = str(uuid4())
    now     = datetime.now(timezone.utc).isoformat()
    hashed  = _hash_password(body.password)
    db = get_db()
    db.execute(
        "INSERT INTO users (id, email, password_hash, token_balance, created_at) VALUES (?,?,?,?,?)",
        (user_id, body.email, hashed, 0, now),
    )
    db.commit()
    return AuthResponse(
        token=create_token(user_id),
        user=UserOut(id=user_id, email=body.email, token_balance=0, created_at=now),
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    user = _get_user_by_email(body.email.strip().lower())
    if not user or not _verify_password(body.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return AuthResponse(
        token=create_token(user["id"]),
        user=UserOut(id=user["id"], email=user["email"],
                     token_balance=user["token_balance"], created_at=user.get("created_at")),
    )


@router.get("/me", response_model=UserOut)
def me(user_id: str = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user = _get_user_by_id(user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return UserOut(id=user["id"], email=user["email"],
                   token_balance=user["token_balance"], created_at=user.get("created_at"))


# ── Token purchase ────────────────────────────────────────────────────────────

@router.post("/buy", response_model=UserOut)
def buy_tokens(body: BuyRequest, user_id: str = Depends(require_user)):
    bundle = BUNDLES.get(body.bundle)
    if not bundle:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown bundle")
    db  = get_db()
    now = datetime.now(timezone.utc).isoformat()
    db.execute("UPDATE users SET token_balance = token_balance + ? WHERE id = ?", (bundle["tokens"], user_id))
    db.execute(
        "INSERT INTO token_purchases (id, user_id, tokens, price_usd, label, created_at) VALUES (?,?,?,?,?,?)",
        (str(uuid4()), user_id, bundle["tokens"], bundle["price_usd"], bundle["label"], now),
    )
    db.commit()
    user = _get_user_by_id(user_id)
    return UserOut(id=user["id"], email=user["email"],
                   token_balance=user["token_balance"], created_at=user.get("created_at"))


# ── Account data endpoints ────────────────────────────────────────────────────

@router.get("/stats", response_model=StatsOut)
def get_stats(user_id: str = Depends(require_user)):
    db = get_db()
    tokens_purchased = db.execute(
        "SELECT COALESCE(SUM(tokens),0) FROM token_purchases WHERE user_id=?", (user_id,)
    ).fetchone()[0]
    tokens_spent = db.execute(
        "SELECT COALESCE(SUM(tokens),0) FROM token_usage WHERE user_id=?", (user_id,)
    ).fetchone()[0]
    from app.models import job_store
    total_renders = sum(1 for j in job_store.list_recent(10000) if j.user_id == user_id)
    return StatsOut(
        total_renders=total_renders,
        tokens_purchased=int(tokens_purchased),
        tokens_spent=int(tokens_spent),
    )


@router.get("/purchases", response_model=List[PurchaseOut])
def get_purchases(user_id: str = Depends(require_user)):
    rows = get_db().execute(
        "SELECT * FROM token_purchases WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
        (user_id,),
    ).fetchall()
    return [PurchaseOut(
        id=r["id"], tokens=r["tokens"], price_usd=r["price_usd"],
        label=r["label"] or "", created_at=r["created_at"],
    ) for r in rows]


@router.get("/usage", response_model=List[UsageOut])
def get_usage(user_id: str = Depends(require_user)):
    rows = get_db().execute(
        "SELECT * FROM token_usage WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
        (user_id,),
    ).fetchall()
    return [UsageOut(
        id=r["id"], job_id=r["job_id"], tokens=r["tokens"],
        quality=r["quality"], created_at=r["created_at"],
    ) for r in rows]


@router.get("/renders")
def get_user_renders(request: Request, user_id: str = Depends(require_user)):
    from app.models import job_store, JobPublic
    base_url = str(request.base_url).rstrip("/")
    jobs = [j for j in job_store.list_recent(200) if j.user_id == user_id]
    return [JobPublic.from_job(j, base_url) for j in jobs]


# ── Settings ──────────────────────────────────────────────────────────────────

@router.post("/change-password")
def change_password(body: ChangePasswordRequest, user_id: str = Depends(require_user)):
    db = get_db()
    row = db.execute("SELECT password_hash FROM users WHERE id=?", (user_id,)).fetchone()
    if not row or not _verify_password(body.old_password, row["password_hash"]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    db.execute("UPDATE users SET password_hash=? WHERE id=?", (_hash_password(body.new_password), user_id))
    db.commit()
    return {"ok": True}


# ── Meta ──────────────────────────────────────────────────────────────────────

@router.get("/bundles")
def get_bundles():
    return BUNDLES


@router.get("/token-costs")
def get_token_costs():
    return TOKEN_COSTS
