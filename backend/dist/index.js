"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const errorHandler_middleware_1 = require("./middleware/errorHandler.middleware");
const logger_middleware_1 = require("./middleware/logger.middleware");
const weather_routes_1 = __importDefault(require("./routes/weather.routes"));
const healthAdvisory_routes_1 = __importDefault(require("./routes/healthAdvisory.routes"));
const heatIndex_routes_1 = __importDefault(require("./routes/heatIndex.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const principal_routes_1 = __importDefault(require("./routes/principal.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const announcements_routes_1 = __importDefault(require("./routes/announcements.routes"));
const parentMessages_routes_1 = __importDefault(require("./routes/parentMessages.routes"));
const weather_service_1 = require("./services/weather.service");
// Import routes (to be created)
// import schoolRoutes from './routes/school.routes';
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const WEATHER_SNAPSHOT_INTERVAL_MINUTES = Number(process.env.WEATHER_SNAPSHOT_INTERVAL_MINUTES ?? 15);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(logger_middleware_1.logger);
app.use((0, morgan_1.default)('dev'));
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
app.use('/api/users', user_routes_1.default);
app.use('/api/students', student_routes_1.default);
app.use('/api/weather', weather_routes_1.default);
app.use('/api/heat-index', heatIndex_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/announcements', announcements_routes_1.default);
app.use('/api/parent-messages', parentMessages_routes_1.default);
// app.use('/api/schools', schoolRoutes);
app.use('/api/health-advisories', healthAdvisory_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/principal', principal_routes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.originalUrl}`
    });
});
// Error handler middleware (must be last)
app.use(errorHandler_middleware_1.errorHandler);
const startWeatherSnapshotScheduler = () => {
    const intervalMs = Math.max(1, WEATHER_SNAPSHOT_INTERVAL_MINUTES) * 60 * 1000;
    const collectSnapshot = async () => {
        try {
            await weather_service_1.weatherService.getCurrentWeather();
        }
        catch (error) {
            console.error('Weather snapshot scheduler error:', error);
        }
    };
    // Prime one reading on startup, then continue on schedule.
    void collectSnapshot();
    setInterval(() => {
        void collectSnapshot();
    }, intervalMs);
};
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🌡️  Beat the Heat API initialized`);
    console.log(`⏱️  Weather snapshot scheduler: every ${Math.max(1, WEATHER_SNAPSHOT_INTERVAL_MINUTES)} minute(s)`);
    startWeatherSnapshotScheduler();
});
exports.default = app;
//# sourceMappingURL=index.js.map