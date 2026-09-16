import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

export interface HeatThresholds {
	safeMax: number;
	cautionMax: number;
	extremeCautionMax: number;
	dangerMax: number;
}

export const DEFAULT_HEAT_THRESHOLDS: HeatThresholds = {
	safeMax: 27,
	cautionMax: 32,
	extremeCautionMax: 41,
	dangerMax: 54,
};

const STORE_PATH = path.resolve(process.cwd(), 'logs', 'heat-thresholds.json');

const loadFromDisk = (): HeatThresholds => {
	try {
		const raw = readFileSync(STORE_PATH, 'utf-8');
		const parsed = JSON.parse(raw);
		return {
			safeMax: Number(parsed.safeMax),
			cautionMax: Number(parsed.cautionMax),
			extremeCautionMax: Number(parsed.extremeCautionMax),
			dangerMax: Number(parsed.dangerMax),
		};
	} catch {
		return { ...DEFAULT_HEAT_THRESHOLDS };
	}
};

let currentThresholds: HeatThresholds = loadFromDisk();

export const getHeatThresholds = (): HeatThresholds => currentThresholds;

export const isValidThresholdOrder = (thresholds: HeatThresholds): boolean =>
	thresholds.safeMax < thresholds.cautionMax &&
	thresholds.cautionMax < thresholds.extremeCautionMax &&
	thresholds.extremeCautionMax < thresholds.dangerMax;

export const setHeatThresholds = (thresholds: HeatThresholds): void => {
	currentThresholds = thresholds;
	try {
		writeFileSync(STORE_PATH, JSON.stringify(thresholds, null, 2));
	} catch (err) {
		console.error('Failed to persist heat thresholds:', err);
	}
};
