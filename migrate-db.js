#!/usr/bin/env node
/**
 * Direct SQL migration script for CreatureQuest
 * Adds 'name' and 'class' columns to players table
 * Run: node migrate-db.js
 */

const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: true
    },
    connectionTimeoutMillis: 30000,
    statement_timeout: 30000
  });

  try {
    console.log('🔌 Connecting to database (timeout: 30s)...');
    await client.connect();
    console.log('✅ Connected!');

    console.log('\n📝 Running migrations...');

    // Add name column
    await client.query(`
      ALTER TABLE players 
      ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Hero';
    `);
    console.log('  ✓ Added "name" column');

    // Add class column
    await client.query(`
      ALTER TABLE players 
      ADD COLUMN IF NOT EXISTS class TEXT NOT NULL DEFAULT 'warrior';
    `);
    console.log('  ✓ Added "class" column');

    // Update existing records to have meaningful defaults
    await client.query(`
      UPDATE players 
      SET name = COALESCE(NULLIF(name, 'Hero'), 'Hero #' || fid),
          class = COALESCE(NULLIF(class, 'warrior'), 'warrior')
      WHERE name = 'Hero' OR class IS NULL;
    `);

    console.log('\n✨ Migration complete!');
    console.log('\n📊 Schema updated:');
    console.log('  • players.name (TEXT, NOT NULL, default: "Hero")');
    console.log('  • players.class (TEXT, NOT NULL, default: "warrior")');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('  → Database connection refused. Check your DATABASE_URL');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('  → Connection timed out. The pooler endpoint may not be reachable from your network');
      console.error('  → Try using the direct endpoint or check Supabase dashboard');
    } else if (error.code === 'ENOTFOUND') {
      console.error('  → DNS resolution failed. The hostname may be incorrect or network unreachable');
    }
    process.exit(1);
  } finally {
    try {
      await client.end();
      console.log('\n👋 Disconnected');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

migrate();
