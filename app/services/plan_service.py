from app.models import User, UserProfile


def ensure_user_plan_profile(user: User) -> UserProfile:
    if user.plan_profile:
        if user.plan_profile.email != user.email:
            user.plan_profile.email = user.email
        return user.plan_profile

    plan_profile = UserProfile(
        id=user.id,
        email=user.email,
        plan="free",
        free_uses=5,
        uses_count=0,
    )
    user.plan_profile = plan_profile
    return plan_profile
