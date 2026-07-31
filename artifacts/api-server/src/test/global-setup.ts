import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import path from 'path';

let container: any;

export async function setup() {
  console.log('\\n[Test Setup] Starting ephemeral PostgreSQL container...');
  
  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('testdb')
    .withUsername('testuser')
    .withPassword('testpass')
    .start();

  const databaseUrl = container.getConnectionUri();
  
  // Set the environment variable globally for vitest
  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = 'dummy_jwt_secret_for_testing';
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5000';

  console.log(`[Test Setup] Database started at: ${databaseUrl}`);
  console.log('[Test Setup] Running database migrations...');

  try {
    // Run drizzle push on the ephemeral database
    // We execute this from the root workspace where db:push is defined, 
    // or we can execute drizzle-kit directly.
    const rootDir = path.resolve(__dirname, '../../../../');
    execSync('pnpm db:push', { 
      cwd: rootDir, 
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit' 
    });
    console.log('[Test Setup] Migrations complete.\\n');
  } catch (error) {
    console.error('[Test Setup] Migration failed:', error);
    throw error;
  }
}

export async function teardown() {
  if (container) {
    console.log('\\n[Test Teardown] Stopping ephemeral PostgreSQL container...');
    await container.stop();
  }
}
