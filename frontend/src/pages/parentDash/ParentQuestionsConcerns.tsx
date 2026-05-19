import React from 'react';
import { ParentSectionPage } from './ParentSectionPage';

export const ParentQuestionsConcerns: React.FC = () => {
  return (
    <ParentSectionPage
      eyebrow="Parent Support"
      title="Questions and Concerns"
      description="A place for parents to review the most common heat-safety questions, check what to report, and understand where to escalate issues."
      summary="This section keeps parent concerns focused on school heat safety, student well-being, and the correct channel for feedback."
      highlights={[
        { label: 'Open concern types', value: 'Heat, health, schedule, safety' },
        { label: 'Response mode', value: 'Guided and scoped' },
        { label: 'Best use', value: 'Before sending a message to school staff' },
      ]}
      sections={[
        {
          title: 'What parents can ask',
          body: 'Use this area for practical questions about school heat conditions and student safety.',
          bullets: [
            'Is outdoor activity safe today?',
            'What should my child bring for class under high heat?',
            'Who should I contact if my child feels unwell after school?',
          ],
        },
        {
          title: 'What to report quickly',
          body: 'Send a concern immediately when a child shows possible heat-related symptoms or when a school notice is unclear.',
          bullets: [
            'Dizziness, headache, nausea, or exhaustion',
            'Repeated absence from class due to heat-related illness',
            'Questions about a schedule change or activity suspension',
          ],
          tone: 'alert',
        },
        {
          title: 'How the project handles concerns',
          body: 'The system is scoped to heat advisories, weather context, school alerts, and parent-facing safety guidance.',
          bullets: [
            'It does not replace medical advice or emergency services.',
            'It prioritizes heat index, humidity, and school operations.',
            'It helps parents decide when to ask for urgent follow-up.',
          ],
          tone: 'success',
        },
      ]}
      footerNote="For live, scoped answers, go to the Chatbot page and ask a question in English, Tagalog, or Taglish."
    />
  );
};