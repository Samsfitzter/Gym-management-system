import pool from '../db/database.js';
import BiometricEventProcessor from './biometricEventProcessor.js';

class BiometricEventScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  async processEvents() {
    console.log(`[EventScheduler] Interval fired. isRunning=${this.isRunning}`);
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      // Obtain distributed lock using Postgres advisory locks
      const SCHEDULER_LOCK_ID = process.env.SCHEDULER_LOCK_ID || 2001;
      const client = await pool.connect();
      try {
        const lockAcquired = await client.query('SELECT pg_try_advisory_lock($1) as locked', [SCHEDULER_LOCK_ID]);
        
        if (lockAcquired.rows[0].locked) {
          console.log('[EventScheduler] Lock acquired, invoking processPendingEvents()');
          await BiometricEventProcessor.processPendingEvents();
        } else {
          console.log('[EventScheduler] Failed to acquire lock (another process may be holding it).');
        }
      } finally {
        const SCHEDULER_LOCK_ID = process.env.SCHEDULER_LOCK_ID || 2001;
        console.log('[EventScheduler] Releasing lock and client...');
        await client.query('SELECT pg_advisory_unlock($1)', [SCHEDULER_LOCK_ID]);
        client.release();
      }
    } catch (error) {
      console.error('[EventScheduler] Critical error:', error.stack || error);
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    if (this.intervalId) return;

    // Use BIOMETRIC_SYNC_INTERVAL_MS from env, or default to 10 seconds
    const intervalMs = process.env.BIOMETRIC_SYNC_INTERVAL_MS 
      ? parseInt(process.env.BIOMETRIC_SYNC_INTERVAL_MS, 10) 
      : 10000;

    console.log(`[EventScheduler] Starting event processing scheduler (interval: ${intervalMs}ms)`);
    
    // Initial run immediately
    this.processEvents();

    this.intervalId = setInterval(() => {
      this.processEvents();
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[EventScheduler] Stopped');
    }
  }
}

export default new BiometricEventScheduler();
