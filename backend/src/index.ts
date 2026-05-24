import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.middleware';
import { logger } from './middleware/logger.middleware';
import weatherRoutes from './routes/weather.routes';
import healthAdvisoryRoutes from './routes/healthAdvisory.routes';
import heatIndexRoutes from './routes/heatIndex.routes';
import adminRoutes from './routes/admin.routes';
import principalRoutes from './routes/principal.routes';
import userRoutes from './routes/user.routes';
import studentRoutes from './routes/student.routes';
import notificationRoutes from './routes/notification.routes';
import announcementsRoutes from './routes/announcements.routes';
import parentMessagesRoutes from './routes/parentMessages.routes';
import incidentsRoutes from './routes/incidents.routes';
import { weatherService } from './services/weather.service';
import { aiAnalysisService } from './services/aiAnalysis.service';
import { notificationService } from './services/notification.service';

// Import routes (to be created)
// import schoolRoutes from './routes/school.routes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = Number(process.env.PORT ?? 5000);
const WEATHER_SNAPSHOT_INTERVAL_MINUTES = Number(process.env.WEATHER_SNAPSHOT_INTERVAL_MINUTES ?? 1);
const AI_ADVISORY_INTERVAL_MINUTES = Number(process.env.AI_ADVISORY_INTERVAL_MINUTES ?? 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Beat the Heat API is running',
    endpoint: req.path,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/heat-index', heatIndexRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/parent-messages', parentMessagesRoutes);
app.use('/api/incidents', incidentsRoutes);
// app.use('/api/schools', schoolRoutes);
app.use('/api/health-advisories', healthAdvisoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/principal', principalRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

const startWeatherSnapshotScheduler = (): void => {
  const intervalMs = Math.max(1, WEATHER_SNAPSHOT_INTERVAL_MINUTES) * 60 * 1000;

  const collectSnapshot = async (): Promise<void> => {
    try {
      const snapshot = await weatherService.getCurrentWeather();
      await notificationService.dispatchHeatAlerts(snapshot);
    } catch (error) {
      console.error('Weather snapshot scheduler error:', error);
    }
  };

  // Prime one reading on startup, then continue on schedule.
  void collectSnapshot();
  setInterval(() => {
    void collectSnapshot();
  }, intervalMs);
};

const startAdvisoryScheduler = (): void => {
  const intervalMs = Math.max(1, AI_ADVISORY_INTERVAL_MINUTES) * 60 * 1000;
  const advisoryQuery = 'Realtime health advisory update for current heat index.';

  const generateAdvisory = async (): Promise<void> => {
    try {
      const weather = await weatherService.getCurrentWeather();
      await aiAnalysisService.generateScopedAdvisory({
        query: advisoryQuery,
        weather,
      });
    } catch (error) {
      console.error('AI advisory scheduler error:', error);
    }
  };

  void generateAdvisory();
  setInterval(() => {
    void generateAdvisory();
  }, intervalMs);
};

const startDailyNotificationScheduler = (): void => {
  const scheduledTimes = (process.env.DAILY_NOTIFICATION_TIMES ?? '09:00,14:00,18:00')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const lastSentForTime = new Map<string, string>(); // time -> date string YYYY-MM-DD

  const checkAndSend = async (): Promise<void> => {
    try {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0,5);
      if (!scheduledTimes.includes(hhmm)) return;

      const todayKey = now.toISOString().slice(0,10);
      const lastSent = lastSentForTime.get(hhmm);
      if (lastSent === todayKey) return; // already sent for this time today

      // get current weather and dispatch advisory
      const snapshot = await weatherService.getCurrentWeather();
      await notificationService.dispatchAdvisoryForSnapshot(snapshot);
      lastSentForTime.set(hhmm, todayKey);
    } catch (err) {
      console.error('Daily notification scheduler error:', err);
    }
  };

  // run immediately check and then every minute
  void checkAndSend();
  setInterval(() => void checkAndSend(), 60 * 1000);
  console.log(`⏰ Daily notification scheduler enabled for times: ${(process.env.DAILY_NOTIFICATION_TIMES ?? '09:00,14:00,18:00')}`);
};

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌡️  Beat the Heat API initialized`);
  console.log(`⏱️  Weather snapshot scheduler: every ${Math.max(1, WEATHER_SNAPSHOT_INTERVAL_MINUTES)} minute(s)`);
  console.log(`🤖 AI advisory scheduler: every ${Math.max(1, AI_ADVISORY_INTERVAL_MINUTES)} minute(s)`);
  startWeatherSnapshotScheduler();
  startAdvisoryScheduler();
  startDailyNotificationScheduler();
});

export default app;
