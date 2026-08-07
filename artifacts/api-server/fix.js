const { Client } = require('pg');
require('dotenv').config();

async function fix() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log("Connected, running fix...");
    // Just drop the enum if it exists so the migration can recreate it cleanly
    await client.query(`DROP TYPE IF EXISTS "public"."support_sender_role" CASCADE;`);
    console.log("Dropped enum successfully.");
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

fix();
