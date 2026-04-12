import { Request, Response, NextFunction } from 'express';

export const logger = (req: Request, _res: Response, next: NextFunction): void => {
	const startedAt = Date.now();
	resOnFinish(req, startedAt);
	next();
};

const resOnFinish = (req: Request, startedAt: number): void => {
	req.res?.on('finish', () => {
		const durationMs = Date.now() - startedAt;
		console.log(
			`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${req.res?.statusCode} (${durationMs}ms)`
		);
	});
};
