import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('members', 'device_settings', 'sync_jobs', 'attendance', 'biometric_raw_events');
    `);
    
    const schema = {};
    for (const row of res.rows) {
      if (!schema[row.table_name]) {
        schema[row.table_name] = [];
      }
      schema[row.table_name].push(row.column_name);
    }
    console.log(JSON.stringify(schema, null, 2));

    const constraints = await pool.query(`
        SELECT conname, conrelid::regclass AS table_name 
        FROM pg_constraint 
        WHERE conname IN ('uq_device_log_id', 'uq_checkout_device_log_id');
    `);
    console.log('Constraints:', JSON.stringify(constraints.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
