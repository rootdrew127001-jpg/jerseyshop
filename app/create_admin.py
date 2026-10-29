import sys
import os

def create_or_update_admin(email: str = None, password: str = None, name: str = "Administrator"):
    from app.core.database import SessionLocal
    from app.services.user_service import create_admin_account
    
    email = email or os.getenv("DEFAULT_ADMIN_EMAIL", "admin@modelyx.com")
    password = password or os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
    name = name or os.getenv("DEFAULT_ADMIN_NAME", "Store Administrator")
    
    with SessionLocal() as db:
        user, err = create_admin_account(db, email=email, password=password, name=name)
        if err:
            print(f"[ERROR] Failed to create admin account: {err}")
            return False
        print(f"[SUCCESS] Admin account ready:")
        print(f"  - Email:    {user.email}")
        print(f"  - Name:     {user.name}")
        print(f"  - Role:     {user.role}")
        print(f"  - Verified: {bool(user.is_verified)}")
        return True

if __name__ == "__main__":
    email_arg = sys.argv[1] if len(sys.argv) > 1 else None
    pass_arg = sys.argv[2] if len(sys.argv) > 2 else None
    name_arg = sys.argv[3] if len(sys.argv) > 3 else "Store Administrator"
    create_or_update_admin(email_arg, pass_arg, name_arg)

