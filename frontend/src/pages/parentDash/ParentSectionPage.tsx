import React from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MdInfoOutline, MdOpenInNew } from 'react-icons/md';
import '../../styles/ParentPortalPages.css';

interface ParentSectionPageProps {
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  highlights: Array<{ label: string; value: string }>;
  sections: Array<{ title: string; body: string; bullets?: string[]; tone?: 'default' | 'alert' | 'success' }>;
  footerNote: string;
}

export const ParentSectionPage: React.FC<ParentSectionPageProps> = ({
  eyebrow,
  title,
  description,
  summary,
  highlights,
  sections,
  footerNote,
}) => {
  return (
    <div className="parent-portal-page">
      <div className="parent-portal-hero">
        <div>
          <p className="parent-portal-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="parent-portal-hero-card">
          <MdInfoOutline className="parent-portal-hero-icon" />
          <div>
            <strong>Focused on the parent use case</strong>
            <p>{summary}</p>
          </div>
        </div>
      </div>

      <div className="parent-portal-highlights">
        {highlights.map((item) => (
          <Card key={item.label} className="parent-portal-highlight-card" hoverable>
            <span className="parent-portal-highlight-label">{item.label}</span>
            <span className="parent-portal-highlight-value">{item.value}</span>
          </Card>
        ))}
      </div>

      <div className="parent-portal-sections">
        {sections.map((section) => (
          <Card key={section.title} title={section.title} className={`parent-portal-card tone-${section.tone ?? 'default'}`}>
            <p className="parent-portal-body">{section.body}</p>
            {section.bullets && (
              <ul className="parent-portal-list">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <Card className="parent-portal-footer-card">
        <div className="parent-portal-footer">
          <div>
            <h3>Need to jump deeper?</h3>
            <p>{footerNote}</p>
          </div>
          <Button variant="outline" icon={<MdOpenInNew />}>
            Open in Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
};