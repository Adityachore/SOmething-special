import asyncio
import asyncpg
import sys

async def main():
    connection_strings = [
        'postgresql://aicmp:aicmp_secret@localhost:5432/ai_cmp',
        'postgresql://aicmp:aicmp_secret@postgres:5432/ai_cmp'
    ]
    
    conn = None
    for conn_str in connection_strings:
        try:
            print(f"Attempting to connect to: {conn_str}")
            conn = await asyncpg.connect(conn_str)
            print("Connected successfully!")
            break
        except Exception as e:
            print(f"Connection failed: {e}")
            
    if not conn:
        print("Error: Could not connect to database on any address.")
        sys.exit(1)
        
    try:
        print("Creating teams table...")
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS teams (
                id VARCHAR(255) PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(100) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        print("Creating team_members table...")
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS team_members (
                id VARCHAR(255) PRIMARY KEY,
                team_id VARCHAR(255) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role_in_team VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (team_id, user_id)
            )
        ''')
        
        print("Altering complaints table to add assigned_team_id...")
        await conn.execute('''
            ALTER TABLE complaints 
            ADD COLUMN IF NOT EXISTS assigned_team_id VARCHAR(255) REFERENCES teams(id) ON DELETE SET NULL
        ''''')
        
        print("Migration successful!")
    except Exception as e:
        print(f"Migration failed with error: {e}")
        sys.exit(1)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
