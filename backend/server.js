import './config.js';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { AttendanceService } from './services/attendanceService.js';
import biometricEventScheduler from './services/biometricEventScheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure CORS to support local development and production domains (including Vercel preview environments)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or local scripts)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.includes(origin) ||
      (origin.startsWith('https://gym-management-system-') && origin.endsWith('.vercel.app'));

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight OPTIONS support across all routes

app.use(express.json());

// Serve uploaded profile images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'ok' },
    message: 'Server is healthy'
  });
});

// Mount modular router aggregator
app.use('/api', routes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const statusCode = err.status || 500;
  const message = (statusCode === 500 && process.env.NODE_ENV === 'production')
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    data: null,
    message
  });
});

// Port configuration
const PORT = process.env.PORT || 5001;

// Start Express App
app.listen(PORT, () => {
  console.log(`Server is running in dev mode on port ${PORT}`);
});

// Nightly auto-close: at 23:59 every day, close all open attendance sessions
cron.schedule('59 23 * * *', async () => {
  try {
    console.log('[Nightly Cron] Auto-closing stale attendance sessions...');
    const result = await AttendanceService.autoCloseStale();
    console.log(`[Nightly Cron] Auto-closed ${result.closed} open session(s).`);
  } catch (err) {
    console.error('[Nightly Cron] Auto-close failed:', err.message);
  }
}, {
  timezone: process.env.TIMEZONE || 'Asia/Kolkata'
});

// Start Biometric Event Scheduler
const enableBiometric = process.env.ENABLE_BIOMETRIC !== 'false';
if (enableBiometric) {
  console.log('[Server] Biometric event scheduler enabled. Starting...');
  biometricEventScheduler.start();
} else {
  console.log('[Server] Biometric event scheduler disabled by environment variable.');
}
