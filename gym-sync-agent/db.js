import './config.js';
import pg from 'pg';

const { Pool } = pg;

// Prevent automatic parsing of DATE and TIMESTAMP to JS Date objects
pg.types.setTypeParser(1082, (val) => val); // DATE
pg.types.setTypeParser(1114, (val) => val); // TIMESTAMP
pg.types.setTypeParser(1184, (val) => val); // TIMESTAMPTZ
pg.types.setTypeParser(1700, (val) => parseFloat(val)); // NUMERIC (amount)

const isLocal = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('localhost') || 
  process.env.DATABASE_URL.includes('127.0.0.1')
);

// Fix PostgreSQL pg module warning regarding sslmode=require
let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes('sslmode=require') && !connectionString.includes('uselibpqcompat=true')) {
  connectionString = connectionString.replace('sslmode=require', 'sslmode=require&uselibpqcompat=true');
}

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PG client:', err);
});

export default pool;
