import { aiAnalysisService } from '../services/aiAnalysis.service';
import type { AdvisoryResult } from '../types';

type AudienceRole = 'teacher' | 'principal' | 'head-teacher' | 'parent' | 'admin';

type RoleGuidanceService = {
	applyAudienceGuidance: (result: AdvisoryResult, role: AudienceRole) => AdvisoryResult;
};

const roleGuidance = aiAnalysisService as unknown as RoleGuidanceService;

const baseResult = (): AdvisoryResult => ({
	summary: 'Heat conditions require caution.',
	riskLevel: 'caution',
	actions: ['Provide water breaks.'],
	safetyTips: ['Monitor for heat stress.'],
	scopeNote: 'System weather inputs only.',
	confidenceScore: 0.9,
	decisionBasis: {
		heatIndexC: 34,
		temperatureC: 31,
		humidityPercent: 65,
		heatLevel: 'caution',
		dataSource: 'test',
		rationale: ['Test input'],
	},
	modelProfile: { mode: 'rule-grounded-ai', scope: 'system-only' },
});

describe('role-aware advisory guidance', () => {
	test('keeps the same risk signal but changes teacher and principal actions', () => {
		const teacher = roleGuidance.applyAudienceGuidance(baseResult(), 'teacher');
		const principal = roleGuidance.applyAudienceGuidance(baseResult(), 'principal');

		expect(teacher.riskLevel).toBe('caution');
		expect(principal.riskLevel).toBe('caution');
		expect(teacher.actions[0]).toContain('PE, recess');
		expect(principal.actions[0]).toContain('school-wide');
		expect(teacher.actions[0]).not.toBe(principal.actions[0]);
	});

	test.each<AudienceRole>(['head-teacher', 'parent', 'admin'])('provides guidance for %s', (role) => {
		const result = roleGuidance.applyAudienceGuidance(baseResult(), role);
		expect(result.actions.length).toBeGreaterThan(1);
		expect(result.riskLevel).toBe('caution');
	});
});
