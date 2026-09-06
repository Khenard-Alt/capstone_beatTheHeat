import React from 'react';
import { ParentSectionPage } from './ParentSectionPage';

export const ParentAdvisory: React.FC = () => {
  return (
    <ParentSectionPage
      eyebrow="AI Guidance"
      title="AI Advisory"
      description="A parent-safe view of the advisory logic that explains heat risk, school actions, and recommended next steps."
      summary="This page stays inside the project scope: heat index, weather conditions, school safety advice, and parent-ready recommendations."
      highlights={[
        { label: 'Inputs', value: 'Heat, humidity, temperature' },
        { label: 'Outputs', value: 'Risk level and actions' },
        { label: 'Scope', value: 'School heat safety only' },
      ]}
      sections={[
        {
          title: 'How the advisory works',
          body: 'The advisory reads the current school weather context and converts it into practical guidance for families.',
          bullets: [
            'Normal, caution, extreme caution, danger, and extreme danger levels',
            'Parent actions for hydration, rest, and activity limits',
            'Safety reminders when the school must adjust operations',
          ],
        },
        {
          title: 'What it will not do',
          body: 'The advisory does not make diagnosis claims or replace emergency care.',
          bullets: [
            'It will not replace a doctor or clinic.',
            'It will not answer unrelated questions outside the system scope.',
            'It will not promise school decisions without data support.',
          ],
          tone: 'alert',
        },
        {
          title: 'Best parent follow-up',
          body: 'Use the chatbot page to ask follow-up questions about a specific advisory result.',
          bullets: [
            'Ask what the advisory means for your child today.',
            'Confirm if PE, recess, or pickup timing changed.',
            'Review what signs should trigger urgent action at home.',
          ],
          tone: 'success',
        },
      ]}
      footerNote="If you want a conversational explanation of an advisory result, open Chatbot and ask the same question in plain language."
    />
  );
};