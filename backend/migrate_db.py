import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://aicmp:aicmp_secret@localhost:5432/ai_cmp')
    await conn.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS reporting_manager_id VARCHAR REFERENCES users(id)')
    print("Migration successful")
    await conn.close()

asyncio.run(main())
