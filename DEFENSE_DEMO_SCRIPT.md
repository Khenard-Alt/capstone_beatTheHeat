# Beat The Heat - 1-Minute AI Advisory Demo Script

## Goal
Show that advisories are AI-generated, heat-data-driven, system-scoped, and auditable.

## Demo Flow (about 60 seconds)

1. Login page chatbot (10-15s)
- Open the AI chat widget on Login.
- Ask: "Generate advisory based on current heat".
- Point out that the answer includes:
  - Risk Level
  - Confidence
  - Heat Data Basis (heat index, temperature, humidity)
  - AI Rationale
  - Scope note

2. Health Advisory page (20-25s)
- Open Health Advisories.
- Show "AI Advisory Evidence Panel" card.
- Highlight:
  - Model mode: rule-grounded-ai
  - Scope: system-only
  - Confidence value
  - Heat-index basis metrics
  - Rationale bullets

3. Trained behavior explanation (15-20s)
- Show "AI Training Behavior Profile" card.
- Explain:
  - AI uses only in-system weather telemetry.
  - Off-topic prompts are redirected to heat safety.
  - Output is structured and auditable.

## Suggested Defense Lines
- "Our AI is not an open chatbot. It is a rule-grounded advisory engine constrained to school heat safety data."
- "Each advisory includes a confidence score and decision basis so the output is transparent and explainable."
- "This improves trust, because recommendations are tied to measurable heat conditions and can be audited in logs."

## Optional Live Proof
- Trigger advisory endpoint and show JSON fields:
  - confidenceScore
  - decisionBasis
  - modelProfile.scope = system-only
  - modelProfile.mode = rule-grounded-ai
