export declare const projectPolicyFAQ: {
    readonly scope: {
        readonly allowedTopics: readonly ["heat index interpretation", "weather impact on school activities", "class suspension guidance based on heat levels", "parent and student heat-safety precautions", "hydration, outdoor activity adjustments, and warning signs"];
        readonly refusalRule: "If a question is outside heat, weather, school safety advisories, or parent/student precautions, refuse briefly and redirect to in-scope heat-safety guidance.";
    };
    readonly policy: {
        readonly authority: "Final class suspension decisions remain with school leadership and local DepEd authority. The assistant provides heat-based guidance, not official suspension orders.";
        readonly thresholdsC: {
            readonly safe: "< 27";
            readonly caution: "27-32";
            readonly extremeCaution: "32-41";
            readonly danger: "41-54";
            readonly extremeDanger: "> 54";
        };
        readonly operationalGuidance: readonly ["Safe/Caution: continue classes with hydration and reduced peak-heat exposure.", "Extreme Caution: restrict strenuous outdoor activity and monitor students closely.", "Danger/Extreme Danger: suspend strenuous outdoor activity and prepare escalation to school leadership for class schedule actions."];
    };
    readonly parentFAQ: readonly [{
        readonly q: "What should my child bring during hot days?";
        readonly a: "Bring water bottle, light breathable uniform, hand towel, and umbrella or cap when needed.";
    }, {
        readonly q: "When should parents seek clinic assessment?";
        readonly a: "If student shows dizziness, nausea, confusion, unusual fatigue, or persistent headache during hot periods.";
    }, {
        readonly q: "Can classes be suspended because of heat?";
        readonly a: "The assistant gives heat-level guidance; official suspension decisions are made by school and DepEd leadership.";
    }];
};
//# sourceMappingURL=projectPolicyFAQ.d.ts.map