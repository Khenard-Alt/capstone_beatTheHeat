"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const logger = (req, _res, next) => {
    const startedAt = Date.now();
    resOnFinish(req, startedAt);
    next();
};
exports.logger = logger;
const resOnFinish = (req, startedAt) => {
    req.res?.on('finish', () => {
        const durationMs = Date.now() - startedAt;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${req.res?.statusCode} (${durationMs}ms)`);
    });
};
//# sourceMappingURL=logger.middleware.js.map