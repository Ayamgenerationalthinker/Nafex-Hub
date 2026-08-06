import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";

export async function runMigrations(migrationsFolder: string) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const dbUrl = process.env.DATABASE_URL;
  const sslmodeMatch = dbUrl.match(/[?&]sslmode=([^&]+)/i);
  const sslmode = sslmodeMatch?.[1]?.toLowerCase();
  
  let useInsecureSsl = false;
  if (process.env.PG_SSL_INSECURE === "false") {
    useInsecureSsl = false;
  } else if (process.env.PG_SSL_INSECURE === "true") {
    useInsecureSsl = true;
  } else if (sslmode === "disable") {
    useInsecureSsl = false;
  } else if (sslmode) {
    useInsecureSsl = true;
  } else {
    useInsecureSsl = process.env.NODE_ENV === "production";
  }

  const pool = new pg.Pool({ 
    connectionString: dbUrl,
    ...(useInsecureSsl ? { ssl: { rejectUnauthorized: false } } : {})
  });
  const db = drizzle(pool);

  await migrate(db, { migrationsFolder });
  await pool.end();
}
