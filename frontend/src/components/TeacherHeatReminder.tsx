import React from 'react';
import { MdOutlineThermostat } from 'react-icons/md';
import { Card } from './Card';

interface TeacherHeatReminderProps {
  title?: string;
  note?: string;
  extra?: React.ReactNode;
}

const DEFAULT_NOTE = 'Danger-level heat means indoor activities, frequent hydration breaks, and a fast report if symptoms appear.';

/**
 * Shared "danger-level heat" reminder used across every teacher page —
 * previously copy-pasted with minor wording changes on 5 separate pages.
 */
export const TeacherHeatReminder: React.FC<TeacherHeatReminderProps> = ({
  title = 'Heat Reminder',
  note = DEFAULT_NOTE,
  extra,
}) => (
  <Card title={title} className="teacher-panel-card tone-alert">
    <div className="teacher-pill-list">
      <span className="teacher-pill accent"><MdOutlineThermostat /> Danger-level heat</span>
    </div>
    <div className="teacher-sidebar-note" style={{ marginTop: 16 }}>
      {note}
    </div>
    {extra}
  </Card>
);
