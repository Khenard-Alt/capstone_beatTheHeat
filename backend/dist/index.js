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
// Import routes (to be created)
// import userRoutes from './routes/user.routes';
// import heatIndexRoutes from './routes/heatIndex.routes';
// import schoolRoutes from './routes/school.routes';
// import notificationRoutes from './routes/notification.routes';
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
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
// app.use('/api/users', userRoutes);
app.use('/api/weather', weather_routes_1.default);
// app.use('/api/heat-index', heatIndexRoutes);
// app.use('/api/schools', schoolRoutes);
// app.use('/api/notifications', notificationRoutes);
app.use('/api/health-advisories', healthAdvisory_routes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.originalUrl}`
    });
});
// Error handler middleware (must be last)
app.use(errorHandler_middleware_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🌡️  Beat the Heat API initialized`);
});
exports.default = app;
//# sourceMappingURL=index.js.map