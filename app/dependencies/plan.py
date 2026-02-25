from fastapi import Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import HOTMART_CHECKOUT_URL
from app.database import get_db
from app.exceptions import FreeLimitReachedError
from app.models import User
from app.services.plan_service import ensure_user_plan_profile


def check_plan_limit(
    increment_use: bool = True,
):
    def dependency(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> User:
        had_plan_profile = current_user.plan_profile is not None
        plan_profile = ensure_user_plan_profile(current_user)

        if plan_profile.plan == "premium":
            if not had_plan_profile:
                db.add(current_user)
                db.commit()
            return current_user

        if plan_profile.uses_count >= plan_profile.free_uses:
            if not had_plan_profile:
                db.add(current_user)
                db.commit()
            raise FreeLimitReachedError(checkout_url=HOTMART_CHECKOUT_URL)

        if increment_use:
            plan_profile.uses_count += 1
            db.add(current_user)
            db.commit()
        elif not had_plan_profile:
            db.add(current_user)
            db.commit()

        return current_user

    return dependency
