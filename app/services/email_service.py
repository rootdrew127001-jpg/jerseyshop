import aiosmtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import GMAIL_USER, GMAIL_APP_PASSWORD

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

async def send_otp_email(to_email: str, otp: str, name: str = "User"):
    message = MIMEMultipart("alternative")
    message["Subject"] = "Modelyx — Your Verification Code"
    message["From"] = f"Modelyx <{GMAIL_USER}>"
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
        username=GMAIL_USER,
        password=GMAIL_APP_PASSWORD,
    )