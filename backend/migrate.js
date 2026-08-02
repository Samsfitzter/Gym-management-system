import './config.js';
import pool from './db/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const client = await pool.connect();
  
  try {
    // 1. Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Backward compatibility logic (old migrate.js)
    let migrated = false;
    try {
      await client.query(`ALTER TABLE members ADD COLUMN outstanding_balance NUMERIC DEFAULT 0;`);
      console.log('Added outstanding_balance');
      migrated = true;
    } catch (e) {
      // Ignore if already exists
    }
    try {
      await client.query(`ALTER TABLE members ADD COLUMN total_paid NUMERIC DEFAULT 0;`);
      console.log('Added total_paid');
      migrated = true;
    } catch (e) {
      // Ignore if already exists
    }
    
    if (migrated) {
      const members = await client.query('SELECT id, amount FROM members');
      for (const m of members.rows) {
        const payments = await client.query('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE member_id = $1', [m.id]);
        const totalPaid = parseFloat(payments.rows[0].total) || 0;
        const planFee = parseFloat(m.amount) || 0;
        const outstanding = Math.max(0, planFee - totalPaid);
        
        await client.query('UPDATE members SET outstanding_balance = $1, total_paid = $2 WHERE id = $3', [outstanding, totalPaid, m.id]);
      }
      console.log('Updated existing records');
    }

    // 3. Execute new .sql migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    let files = [];
    try {
      files = await fs.readdir(migrationsDir);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      console.log('Migrations directory not found, skipping SQL migrations.');
    }

    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
      // Check if already executed
      const checkRes = await client.query('SELECT 1 FROM migrations WHERE name = $1', [file]);
      if (checkRes.rows.length > 0) {
        continue;
      }

      console.log(`Executing migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Successfully applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error executing ${file}:`, err.message);
        throw err; // Stop execution on failure
      }
    }
    
    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
