"""
Seed script — creates the first tenant and admin user.
Run once after migrations: python scripts/seed.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.base import AsyncSessionLocal
from app.db.models.tenant import Tenant
from app.db.models.user import User, UserRole
from app.core.security import hash_password


async def seed():
    async with AsyncSessionLocal() as db:
        # Create tenant
        tenant = Tenant(
            name="Demo Organization",
            slug="demo-org",
        )
        db.add(tenant)
        await db.flush()

        # Create admin
        admin = User(
            tenant_id=tenant.id,
            name="System Admin",
            email="admin@demo.com",
            hashed_password=hash_password("Admin@1234"),
            role=UserRole.ADMIN,
            email_verified=True,
        )
        db.add(admin)

        # Create demo CMD
        cmd = User(
            tenant_id=tenant.id,
            name="Demo CMD",
            email="cmd@demo.com",
            hashed_password=hash_password("Cmd@1234"),
            role=UserRole.CMD,
            department="IT",
            email_verified=True,
        )
        db.add(cmd)

        # Create demo HR
        hr = User(
            tenant_id=tenant.id,
            name="Demo HR",
            email="hr@demo.com",
            hashed_password=hash_password("Hr@1234"),
            role=UserRole.HR,
            email_verified=True,
        )
        db.add(hr)

        # Create demo Employee
        emp = User(
            tenant_id=tenant.id,
            name="Demo Employee",
            email="employee@demo.com",
            hashed_password=hash_password("Emp@1234"),
            role=UserRole.EMPLOYEE,
            department="IT",
            email_verified=True,
        )
        db.add(emp)

        await db.commit()

        print(f"\n✅ Seeded successfully!")
        print(f"Tenant: {tenant.name} (ID: {tenant.id})")
        print(f"\nDemo credentials:")
        print(f"  Admin:    admin@demo.com / Admin@1234")
        print(f"  CMD:      cmd@demo.com   / Cmd@1234")
        print(f"  HR:       hr@demo.com    / Hr@1234")
        print(f"  Employee: employee@demo.com / Emp@1234")


if __name__ == "__main__":
    asyncio.run(seed())
