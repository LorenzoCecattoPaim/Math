from app.models import User, UserProfile


def ensure_user_plan_profile(user: User) -> UserProfile:
    if user.plan_profile:
        if user.plan_profile.email != user.email:
            user.plan_profile.email = user.email
        if user.plan_profile.plan == "premium":
            user.plan_profile.is_premium = True
        elif user.plan_profile.is_premium:
            user.plan_profile.plan = "premium"
        if not user.plan_profile.subscription_status:
            user.plan_profile.subscription_status = "inactive"
        if not user.plan_profile.payment_status:
            user.plan_profile.payment_status = "pending"
        return user.plan_profile

    plan_profile = UserProfile(
        id=user.id,
        email=user.email,
        plan="free",
        is_premium=False,
        subscription_status="inactive",
        payment_status="pending",
        free_uses=5,
        uses_count=0,
    )
    user.plan_profile = plan_profile
    return plan_profile
