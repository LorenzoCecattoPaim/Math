from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session
import logging
import time

from app.config import HOTMART_WEBHOOK_TOKEN
from app.database import SessionLocal
from app.models import User
from app.services.plan_service import ensure_user_plan_profile

router = APIRouter(tags=["Hotmart"])
logger = logging.getLogger(__name__)

APPROVED_EVENTS = {"PURCHASE_APPROVED"}
CANCELED_EVENTS = {"PURCHASE_CANCELED", "SUBSCRIPTION_CANCELED"}
APPROVED_STATUSES = {"APPROVED", "ACTIVE"}
CANCELED_STATUSES = {"CANCELED", "CANCELLED", "REFUNDED", "CHARGEBACK"}


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


@router.post("/api/hotmart/webhook")
@router.post("/webhook/hotmart", include_in_schema=False)
async def hotmart_webhook(
    request: Request,
    x_hotmart_hottok: str | None = Header(default=None),
):
    start = time.perf_counter()
    if not HOTMART_WEBHOOK_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="HOTMART_WEBHOOK_TOKEN não configurado no backend.",
        )

    if x_hotmart_hottok != HOTMART_WEBHOOK_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de webhook inválido.",
        )

    try:
        payload = await request.json()
    except Exception:
        logger.warning("hotmart_webhook_invalid_json")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook payload.",
        )
    event_name = (
        payload.get("event")
        or payload.get("event_name")
        or payload.get("type")
        or ""
    )
    event_name = str(event_name).strip().upper()

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
    purchase_status = (
        _extract_value(
            payload,
            ("data", "purchase", "status"),
            ("purchase", "status"),
            ("data", "subscription", "status"),
            ("subscription", "status"),
            ("status",),
        )
        or ""
    ).upper()
    should_activate = event_name in APPROVED_EVENTS or purchase_status in APPROVED_STATUSES
    should_cancel = event_name in CANCELED_EVENTS or purchase_status in CANCELED_STATUSES

    if not should_activate and not should_cancel:
        logger.info(
            "hotmart_webhook_ignored event=%s status=%s reason=unsupported_event_and_status",
            event_name,
            purchase_status,
        )
        return {"status": "ignored", "event": event_name}

    if not buyer_email:
        logger.warning("hotmart_webhook_ignored event=%s reason=email_not_found", event_name)
        return {"status": "ignored", "event": event_name, "reason": "email_not_found"}

    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(func.lower(User.email) == buyer_email.lower()).first()
        if user is None:
            logger.warning(
                "hotmart_webhook_ignored event=%s reason=user_not_found email=%s",
                event_name,
                buyer_email.lower(),
            )
            return {"status": "ignored", "event": event_name, "reason": "user_not_found"}

        profile = ensure_user_plan_profile(user)

        if should_activate:
            profile.plan = "premium"
            profile.is_premium = True
            profile.subscription_status = "active"
            profile.payment_status = "approved"
            if purchase_id:
                profile.hotmart_purchase_id = purchase_id
        elif should_cancel:
            profile.plan = "free"
            profile.is_premium = False
            profile.subscription_status = "canceled"
            profile.payment_status = "canceled"
            profile.uses_count = profile.free_uses
            profile.hotmart_purchase_id = None

        db.add(user)
        db.commit()
        logger.info(
            "hotmart_webhook_processed event=%s user_id=%s is_premium=%s duration_ms=%.2f",
            event_name,
            str(user.id),
            profile.is_premium,
            (time.perf_counter() - start) * 1000,
        )
        return {"status": "ok", "event": event_name, "processed": True}
    except Exception:
        logger.exception(
            "hotmart_webhook_failed event=%s email=%s duration_ms=%.2f",
            event_name,
            buyer_email.lower() if buyer_email else "unknown",
            (time.perf_counter() - start) * 1000,
        )
        db.rollback()
        raise
    finally:
        db.close()
