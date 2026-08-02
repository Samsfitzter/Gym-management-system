import './config.js';
import syncService from './syncService.js';
import pool from './db.js';

let isSyncing = false;

const SYNC_AGENT_LOCK_ID = parseInt(process.env.SYNC_AGENT_LOCK_ID, 10) || 1001;

async function performSync() {
  if (isSyncing) {
    console.log('[SyncAgent] Sync already in progress, skipping interval...');
    return;
  }
  
  // Quick lock to prevent concurrent local syncs (lock ID is arbitrary but must be unique to SyncAgent)
  const client = await pool.connect();
  let acquiredHere = false;
  try {
    const lockAcquired = await client.query('SELECT pg_try_advisory_lock($1) as locked', [SYNC_AGENT_LOCK_ID]);
    if (!lockAcquired.rows[0].locked) {
      console.log('[SyncAgent] Another instance is currently syncing. Skipping...');
      return;
    }
    acquiredHere = true;

    isSyncing = true;
    const result = await syncService.runSync();
    if (result.inserted > 0) {
      console.log(`[${new Date().toISOString()}] [SyncAgent] Sync completed: ${result.inserted} raw events inserted.`);
    }

  } catch (err) {
    console.error(`[${new Date().toISOString()}] [SyncAgent] Sync failed:`, err.message);
  } finally {
    if (acquiredHere) {
      await client.query('SELECT pg_advisory_unlock($1)', [SYNC_AGENT_LOCK_ID]);
    }
    client.release();
    isSyncing = false;
  }
}

async function startAgent() {
  console.log('[SyncAgent] Starting up...');
  
  // 1. Immediate sync on startup
  console.log('[SyncAgent] Running initial startup sync...');
  await performSync();
  
  // 2. Schedule polling loop
  const intervalMs = parseInt(process.env.BIOMETRIC_SYNC_INTERVAL_MS || '60000', 10);
  console.log(`[SyncAgent] Entering polling loop (interval: ${intervalMs}ms)...`);
  
  setInterval(performSync, intervalMs);
}

startAgent();
