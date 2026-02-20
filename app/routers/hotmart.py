from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import HOTMART_WEBHOOK_TOKEN
from app.database import SessionLocal
from app.models import User
from app.services.plan_service import ensure_user_plan_profile

router = APIRouter(prefix="/api/hotmart", tags=["Hotmart"])

APPROVED_EVENTS = {"PURCHASE_APPROVED"}
CANCELED_EVENTS = {"PURCHASE_CANCELED", "SUBSCRIPTION_CANCELED"}


def _extract_value(payload: dict[str, Any], *paths: tuple[str, ...]) -> str | None:
    for path in paths:
        current: Any = payload
        for key in path:
            if not isinstance(current, dict) or key not in current:
                current = None
                break
            current = current[key]
        if isinstance(current, str) and current.strip():
            return current.strip()
    return None


@router.post("/webhook")
async def hotmart_webhook(
    request: Request,
    x_hotmart_hottok: str | None = Header(default=None),
):
    if not HOTMART_WEBHOOK_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="HOTMART_WEBHOOK_TOKEN nao configurado no backend.",
        )

    if x_hotmart_hottok != HOTMART_WEBHOOK_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook token invalido.",
        )

    payload = await request.json()
    event_name = (
        payload.get("event")
        or payload.get("event_name")
        or payload.get("type")
        or ""
    )
    event_name = str(event_name).strip().upper()

    if event_name not in APPROVED_EVENTS and event_name not in CANCELED_EVENTS:
        return {"status": "ignored", "event": event_name}

    buyer_email = _extract_value(
        payload,
        ("data", "buyer", "email"),
        ("buyer", "email"),
        ("data", "subscriber", "email"),
        ("subscriber", "email"),
        ("data", "purchase", "buyer", "email"),
        ("purchase", "buyer", "email"),
        ("email",),
    )
    purchase_id = _extract_value(
        payload,
        ("data", "purchase", "transaction"),
        ("purchase", "transaction"),
        ("data", "purchase", "id"),
        ("purchase", "id"),
        ("data", "id"),
        ("id",),
    )

    if not buyer_email:
        return {"status": "ignored", "event": event_name, "reason": "email_not_found"}

    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(func.lower(User.email) == buyer_email.lower()).first()
        if user is None:
            return {"status": "ignored", "event": event_name, "reason": "user_not_found"}

        profile = ensure_user_plan_profile(user)

        if event_name in APPROVED_EVENTS:
            profile.plan = "premium"
            if purchase_id:
                profile.hotmart_purchase_id = purchase_id
        elif event_name in CANCELED_EVENTS:
            profile.plan = "free"
            profile.uses_count = profile.free_uses
            profile.hotmart_purchase_id = None

        db.add(user)
        db.commit()
        return {"status": "ok", "event": event_name, "processed": True}
    finally:
        db.close()
