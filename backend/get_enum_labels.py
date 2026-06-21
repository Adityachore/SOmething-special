import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://aicmp:aicmp_secret@localhost:5432/ai_cmp')
    try:
        vals = await conn.fetch("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'complaintstatus'::regtype;")
        print("Enum labels in database:", [v['enumlabel'] for v in vals])
    except Exception as e:
        print("Error fetching enum labels:", e)
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
