import { getTodayStr } from './dateUtils.js';

/**
 * Generates a unique receipt number in format REC-YYYYMMDD-XXXX.
 * Checks against the database to guarantee uniqueness and avoid constraint violations.
 * 
 * @param {Object} client - PostgreSQL client or pool instance
 * @param {string} [customDateStr] - Optional YYYY-MM-DD date string
 * @returns {Promise<string>} Unique receipt number
 */
export async function generateReceiptNumber(client, customDateStr) {
  let dateFormatted;
  if (customDateStr && typeof customDateStr === 'string' && customDateStr.length >= 10) {
    dateFormatted = customDateStr.slice(0, 10).replace(/-/g, '');
  } else {
    dateFormatted = getTodayStr().replace(/-/g, '');
  }

  // Find max ID and total COUNT from payments table as a sensible starting sequence
  const maxRes = await client.query('SELECT MAX(id) as max_id, COUNT(*) as count FROM payments');
  let seq = Math.max(
    parseInt(maxRes.rows[0]?.max_id || 0, 10),
    parseInt(maxRes.rows[0]?.count || 0, 10)
  ) + 1;

  while (true) {
    const candidate = `REC-${dateFormatted}-${String(seq).padStart(4, '0')}`;
    const check = await client.query('SELECT 1 FROM payments WHERE receipt_number = $1', [candidate]);
    if (check.rows.length === 0) {
      return candidate;
    }
    seq++;
  }
}
