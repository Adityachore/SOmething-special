import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://aicmp:aicmp_secret@postgres:5432/ai_cmp')
    
    print("Migrating invitations table...")
    await conn.execute('ALTER TABLE invitations ADD COLUMN IF NOT EXISTS name VARCHAR(255)')
    await conn.execute('ALTER TABLE invitations ADD COLUMN IF NOT EXISTS employee_id VARCHAR(255)')
    await conn.execute('ALTER TABLE invitations ADD COLUMN IF NOT EXISTS designation VARCHAR(255)')
    await conn.execute('ALTER TABLE invitations ADD COLUMN IF NOT EXISTS phone VARCHAR(50)')
    await conn.execute('ALTER TABLE invitations ADD COLUMN IF NOT EXISTS date_of_joining TIMESTAMP WITH TIME ZONE')
    
    print("Migration successful")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
