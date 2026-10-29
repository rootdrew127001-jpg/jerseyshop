import aiosmtplib
import random
import string
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import GMAIL_ACCOUNTS, GMAIL_USER, GMAIL_APP_PASSWORD, DEV_MODE

logger = logging.getLogger(__name__)

_sender_cursor = 0

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

async def send_otp_email(to_email: str, otp: str, name: str = "User") -> bool:
    global _sender_cursor

    accounts = list(GMAIL_ACCOUNTS)
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
            sender_pass = sender["password"]

            try:
                message = MIMEMultipart("alternative")
                message["Subject"] = "Modelyx — Your Verification Code"
                message["From"] = f"Modelyx <{sender_user}>"
                message["To"] = to_email

                html = f"""
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
                message.attach(MIMEText(html, "html"))

                await aiosmtplib.send(
                    message,
                    hostname="smtp.gmail.com",
                    port=587,
                    start_tls=True,
                    username=sender_user,
                    password=sender_pass,
                    timeout=10
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
    raise RuntimeError("No email senders configured in GMAIL_ACCOUNTS")
