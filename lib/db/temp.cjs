const { Pool } = require('pg');
async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'businesses'");
    console.log('Business columns:', res.rows.map(r => r.column_name).join(', '));
    const m = await pool.query("SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5");
    console.log('Recent migrations:', m.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
