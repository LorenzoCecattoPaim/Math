import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey_change_in_production_minimum_32_chars")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 hours

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
EMAIL_VERIFICATION_EXPIRATION_MINUTES = int(
    os.getenv("EMAIL_VERIFICATION_EXPIRATION_MINUTES", "10")
)
EMAIL_VERIFICATION_MAX_ATTEMPTS = int(
    os.getenv("EMAIL_VERIFICATION_MAX_ATTEMPTS", "5")
)
VERIFICATION_RESEND_COOLDOWN_SECONDS = int(
    os.getenv("VERIFICATION_RESEND_COOLDOWN_SECONDS", "60")
)
VERIFICATION_RESEND_MAX_PER_HOUR = int(
    os.getenv("VERIFICATION_RESEND_MAX_PER_HOUR", "5")
)
PASSWORD_RESET_EXPIRATION_MINUTES = int(
    os.getenv("PASSWORD_RESET_EXPIRATION_MINUTES", "15")
)
PASSWORD_RESET_MAX_PER_HOUR = int(
    os.getenv("PASSWORD_RESET_MAX_PER_HOUR", "5")
)
PASSWORD_MIN_LENGTH = int(os.getenv("PASSWORD_MIN_LENGTH", "6"))

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME)
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", SMTP_FROM_EMAIL)
HOTMART_CHECKOUT_URL = os.getenv(
    "HOTMART_CHECKOUT_URL", "https://provalab-launchpad.vercel.app"
)
HOTMART_WEBHOOK_TOKEN = os.getenv("HOTMART_WEBHOOK_TOKEN", "")
