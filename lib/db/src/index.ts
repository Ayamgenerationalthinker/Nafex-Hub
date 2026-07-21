import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Replit's managed Postgres uses TLS with a certificate that pg v8.16+ now
// validates strictly by default. The connection-string `sslmode=require` is
// treated as `verify-full` in pg v9, which fails against the managed cert.
// Setting `ssl: { rejectUnauthorized: false }` keeps TLS in transit but skips
// CA verification — appropriate for the managed Replit DB where we trust the
// network path.
//
// Detection rules:
//   - `sslmode=disable` in the URL → no SSL at all (respect explicit opt-out)
//   - `PG_SSL_INSECURE=true` env → force insecure TLS (escape hatch)
//   - any other `sslmode=*` in the URL → insecure TLS (Replit-managed DB)
//   - no `sslmode` AND NODE_ENV=production → insecure TLS (default for prod)
//   - otherwise → no SSL (local dev)
// For environments that require full CA verification, set
// `PG_SSL_INSECURE=false` and pass a CA bundle via PGSSLROOTCERT.
const dbUrl = process.env.DATABASE_URL;
const sslmodeMatch = dbUrl.match(/[?&]sslmode=([^&]+)/i);
const sslmode = sslmodeMatch?.[1]?.toLowerCase();

let useInsecureSsl: boolean;
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

export const pool = new Pool({
  connectionString: dbUrl,
  ...(useInsecureSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  max: process.env.DATABASE_POOL_SIZE ? parseInt(process.env.DATABASE_POOL_SIZE, 10) : (process.env.NODE_ENV === "production" ? 30 : 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
