import os
import httpx
import aiosmtplib
import random
import string
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import parse_gmail_accounts, GMAIL_USER, GMAIL_APP_PASSWORD, DEV_MODE, RESEND_API_KEY, RESEND_FROM_EMAIL, BREVO_API_KEY, BREVO_SENDER_EMAIL

logger = logging.getLogger(__name__)

_sender_cursor = 0

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

def build_otp_html(name: str, otp: str) -> str:
    return f"""
    <html>
    <body style="font-family: Inter, Arial, sans-serif; background: #f1f5f9; padding: 40px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0 0 8px;">MODELYX.</h1>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 32px;">AI-Powered Jersey Design Platform</p>
            <p style="color: #0f172a; font-size: 16px;">Hi {name},</p>
            <p style="color: #475569; font-size: 14px;">Your verification code is:</p>
            <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 48px; font-weight: 900; color: #4F46E5; letter-spacing: 12px;">{otp}</span>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
            <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, ignore this email.</p>
        </div>
    </body>
    </html>
    """

async def send_via_brevo(to_email: str, otp: str, name: str = "User", subject: str = "Modelyx — Your Verification Code") -> bool:
    api_key = (os.getenv("BREVO_API_KEY") or BREVO_API_KEY or "").strip()
    if not api_key:
        return False
    sender_email = (os.getenv("BREVO_SENDER_EMAIL") or BREVO_SENDER_EMAIL or GMAIL_USER or "syyortega@gmail.com").strip()
    html = build_otp_html(name, otp)
    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": api_key,
                "Content-Type": "application/json"
            },
            json={
                "sender": {"name": "Modelyx", "email": sender_email},
                "to": [{"email": to_email, "name": name}],
                "subject": subject,
                "htmlContent": html
            }
        )
        if res.status_code in (200, 201):
            print(f"[BREVO] Sent OTP to {to_email} via HTTPS port 443", flush=True)
            return True
        else:
            print(f"[BREVO FAIL] Status {res.status_code}: {res.text}", flush=True)
            return False

async def send_via_resend(to_email: str, otp: str, name: str = "User", subject: str = "Modelyx — Your Verification Code") -> bool:
    api_key = (os.getenv("RESEND_API_KEY") or RESEND_API_KEY or "").strip()
    if not api_key:
        return False
    from_email = (os.getenv("RESEND_FROM_EMAIL") or RESEND_FROM_EMAIL or "Modelyx <onboarding@resend.dev>").strip()
    html = build_otp_html(name, otp)
    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "from": from_email,
                "to": [to_email],
                "subject": subject,
                "html": html
            }
        )
        if res.status_code in (200, 201):
            print(f"[RESEND] Sent OTP to {to_email} via HTTPS port 443", flush=True)
            return True
        else:
            print(f"[RESEND FAIL] Status {res.status_code}: {res.text}", flush=True)
            return False

async def send_otp_email(to_email: str, otp: str, name: str = "User", subject: str = "Modelyx — Your Verification Code") -> bool:
    global _sender_cursor

    brevo_key = (os.getenv("BREVO_API_KEY") or BREVO_API_KEY or "").strip()
    if brevo_key:
        try:
            sent = await send_via_brevo(to_email, otp, name, subject)
            if sent:
                return True
        except Exception as e:
            print(f"[BREVO FAILOVER] Brevo error ({e}). Trying next...", flush=True)

    resend_key = (os.getenv("RESEND_API_KEY") or RESEND_API_KEY or "").strip()
    if resend_key:
        try:
            sent = await send_via_resend(to_email, otp, name, subject)
            if sent:
                return True
        except Exception as e:
            print(f"[RESEND FAILOVER] Resend error ({e}). Trying SMTP...", flush=True)

    accounts = parse_gmail_accounts()
    if not accounts and GMAIL_USER and GMAIL_APP_PASSWORD:
        accounts = [{"user": GMAIL_USER, "password": GMAIL_APP_PASSWORD}]

    last_error = None

    if accounts:
        num_accounts = len(accounts)
        start_idx = _sender_cursor % num_accounts

        for attempt in range(num_accounts):
            idx = (start_idx + attempt) % num_accounts
            sender = accounts[idx]
            sender_user = sender["user"]
            sender_pass = str(sender["password"]).replace(" ", "").strip()

            try:
                message = MIMEMultipart("alternative")
                message["Subject"] = subject
                message["From"] = f"Modelyx <{sender_user}>"
                message["To"] = to_email

                html = build_otp_html(name, otp)
                message.attach(MIMEText(html, "html"))

                await aiosmtplib.send(
                    message,
                    hostname="smtp.gmail.com",
                    port=587,
                    start_tls=True,
                    username=sender_user,
                    password=sender_pass,
                    timeout=3
                )

                _sender_cursor = (idx + 1) % num_accounts
                print(f"[EMAIL POOL] Sent OTP to {to_email} via {sender_user} (Account {idx + 1}/{num_accounts})", flush=True)
                return True

            except Exception as e:
                last_error = e
                print(f"[EMAIL FAILOVER] Sender {sender_user} failed ({e}). Retrying with next sender...", flush=True)

    if DEV_MODE:
        print(f"[DEV_MODE] Senders unavailable ({last_error}). Simulated OTP for {to_email}: [{otp}]", flush=True)
        return True

    if last_error:
        raise last_error
    raise RuntimeError("No email senders configured in GMAIL_ACCOUNTS, BREVO_API_KEY or RESEND_API_KEY")
