"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectPolicyFAQ = void 0;
exports.projectPolicyFAQ = {
    scope: {
        allowedTopics: [
            'heat index interpretation',
            'weather impact on school activities',
            'class suspension guidance based on heat levels',
            'parent and student heat-safety precautions',
            'hydration, outdoor activity adjustments, and warning signs',
        ],
        refusalRule: 'If a question is outside heat, weather, school safety advisories, or parent/student precautions, refuse briefly and redirect to in-scope heat-safety guidance.',
    },
    policy: {
        authority: 'Final class suspension decisions remain with school leadership and local DepEd authority. The assistant provides heat-based guidance, not official suspension orders.',
        thresholdsC: {
            safe: '< 27',
            caution: '27-32',
            extremeCaution: '32-41',
            danger: '41-54',
            extremeDanger: '> 54',
        },
        operationalGuidance: [
            'Safe/Caution: continue classes with hydration and reduced peak-heat exposure.',
            'Extreme Caution: restrict strenuous outdoor activity and monitor students closely.',
            'Danger/Extreme Danger: suspend strenuous outdoor activity and prepare escalation to school leadership for class schedule actions.',
        ],
    },
    parentFAQ: [
        {
            q: 'What should my child bring during hot days?',
            a: 'Bring water bottle, light breathable uniform, hand towel, and umbrella or cap when needed.',
        },
        {
            q: 'When should parents seek clinic assessment?',
            a: 'If student shows dizziness, nausea, confusion, unusual fatigue, or persistent headache during hot periods.',
        },
        {
            q: 'Can classes be suspended because of heat?',
            a: 'The assistant gives heat-level guidance; official suspension decisions are made by school and DepEd leadership.',
        },
    ],
};
//# sourceMappingURL=projectPolicyFAQ.js.map