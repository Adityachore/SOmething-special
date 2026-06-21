import asyncio
import asyncpg
import sys

async def main():
    conn = await asyncpg.connect('postgresql://aicmp:aicmp_secret@localhost:5432/ai_cmp')
    try:
        # Check current values
        vals = await conn.fetch("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'complaintstatus'::regtype;")
        labels = [v['enumlabel'] for v in vals]
        print("Current labels in database:", labels)
        
        # Add missing values (note: ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL)
        for val in ['CLOSED', 'WAITING_FOR_EMPLOYEE', 'RESOLUTION_PROPOSED']:
            if val not in labels:
                print(f"Adding value '{val}' to complaintstatus enum type...")
                await conn.execute(f"ALTER TYPE complaintstatus ADD VALUE '{val}'")
                print(f"Added '{val}' successfully.")
        
        print("Enum labels updated successfully!")
    except Exception as e:
        print(f"Error updating enum labels: {e}")
        sys.exit(1)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
