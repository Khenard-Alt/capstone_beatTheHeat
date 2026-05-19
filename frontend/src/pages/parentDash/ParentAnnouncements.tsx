import React from 'react';
import { ParentSectionPage } from './ParentSectionPage';

export const ParentAnnouncements: React.FC = () => {
  return (
    <ParentSectionPage
      eyebrow="School Updates"
      title="Announcements"
      description="A parent-facing notice board for heat advisories, school schedule changes, and operational reminders."
      summary="This page keeps announcements short, actionable, and directly tied to school heat-safety operations."
      highlights={[
        { label: 'Latest notice', value: 'Heat monitoring active' },
        { label: 'Tone', value: 'Clear and actionable' },
        { label: 'Coverage', value: 'Events, schedules, advisories' },
      ]}
      sections={[
        {
          title: 'Current notice format',
          body: 'Announcements should tell parents what changed, why it changed, and what students should do next.',
          bullets: [
            'Start time or dismissal updates',
            'Activity suspensions or indoor-only reminders',
            'Hydration and clothing guidance during high heat',
          ],
        },
        {
          title: 'Recommended alert priority',
          body: 'Put the highest priority on anything that affects child safety or pickup plans.',
          bullets: [
            'Danger-level heat advisories',
            'Emergency class schedule changes',
            'Parent pickup reminders and clinic follow-up notes',
          ],
          tone: 'alert',
        },
        {
          title: 'Project scope',
          body: 'The announcements area is meant for school operations and parent instructions, not general school social media content.',
          bullets: [
            'Keep messages short and date-specific.',
            'Use the advisory and chatbot pages for explanations.',
            'Link notices back to heat risk levels when possible.',
          ],
          tone: 'success',
        },
      ]}
      footerNote="Need the reason behind an announcement? Open AI Advisory for the heat explanation, then use Chatbot for follow-up questions."
    />
  );
};