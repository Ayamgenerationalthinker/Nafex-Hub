import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL");
    return;
  }
  
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'businesses';
    `);
    console.log("Business columns:", res.rows.map(r => r.column_name).join(", "));
    
    const migs = await pool.query(`SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5`);
    console.log("Recent migrations:", migs.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

main();
