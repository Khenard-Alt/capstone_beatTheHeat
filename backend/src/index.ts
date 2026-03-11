import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.middleware';
import { logger } from './middleware/logger.middleware';

// Import routes (to be created)
// import userRoutes from './routes/user.routes';
// import weatherRoutes from './routes/weather.routes';
// import heatIndexRoutes from './routes/heatIndex.routes';
// import schoolRoutes from './routes/school.routes';
// import notificationRoutes from './routes/notification.routes';
// import healthAdvisoryRoutes from './routes/healthAdvisory.routes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Beat the Heat API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
// app.use('/api/users', userRoutes);
// app.use('/api/weather', weatherRoutes);
// app.use('/api/heat-index', heatIndexRoutes);
// app.use('/api/schools', schoolRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/health-advisories', healthAdvisoryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌡️  Beat the Heat API initialized`);
});

export default app;
