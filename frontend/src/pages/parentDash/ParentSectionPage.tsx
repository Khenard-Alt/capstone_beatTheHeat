import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MdHelpOutline, MdOpenInNew, MdKeyboardArrowDown } from 'react-icons/md';
import '../../styles/ParentPortalPages.css';

interface ParentSectionPageProps {
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  highlights?: Array<{ label: string; value: string }>;
  sections: Array<{ title: string; body: string; bullets?: string[]; tone?: 'default' | 'alert' | 'success' }>;
  footerNote: string;
  /** Where the footer CTA button should take the parent, and what it should say. */
  footerAction?: { label: string; to: string };
  children?: React.ReactNode;
  topId?: string;
}

export const ParentSectionPage: React.FC<ParentSectionPageProps> = ({
  eyebrow,
  title,
  description,
  summary,
  highlights,
  sections,
  footerNote,
  footerAction,
  children,
  topId,
}) => {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(sections[0]?.title ?? null);
  const helpWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showHelp) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (helpWrapRef.current && !helpWrapRef.current.contains(event.target as Node)) {
        setShowHelp(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHelp]);

  return (
    <div className="parent-portal-page">
      <div className="parent-portal-hero">
        <div>
          <p className="parent-portal-eyebrow">{eyebrow}</p>
          <h1 id={topId ?? undefined}>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="parent-portal-help-wrap" ref={helpWrapRef}>
          <button
            type="button"
            className="parent-portal-help-btn"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            aria-label="About this page"
          >
            <MdHelpOutline />
            <span>Help</span>
          </button>
          {showHelp && (
            <div className="parent-portal-help-popover" role="tooltip">
              <strong>Focused on the parent use case</strong>
              <p>{summary}</p>
            </div>
          )}
        </div>
      </div>

      {highlights && highlights.length > 0 && (
        <div className="parent-portal-highlights">
          {highlights.map((item) => (
            <Card key={item.label} className="parent-portal-highlight-card" hoverable>
              <span className="parent-portal-highlight-label">{item.label}</span>
              <span className="parent-portal-highlight-value">{item.value}</span>
            </Card>
          ))}
        </div>
      )}

      <div className="parent-portal-sections parent-portal-accordion">
        {sections.map((section) => {
          const isOpen = openSection === section.title;
          return (
            <div key={section.title} className={`parent-portal-accordion-item tone-${section.tone ?? 'default'} ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="parent-portal-accordion-trigger"
                onClick={() => setOpenSection(isOpen ? null : section.title)}
                aria-expanded={isOpen}
              >
                <span>{section.title}</span>
                <MdKeyboardArrowDown className="parent-portal-accordion-caret" />
              </button>
              {isOpen && (
                <div className="parent-portal-accordion-body">
                  <p className="parent-portal-body">{section.body}</p>
                  {section.bullets && (
                    <ul className="parent-portal-list">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {children && (
        <div className="parent-portal-extra">
          {children}
        </div>
      )}

      <Card className="parent-portal-footer-card">
        <div className="parent-portal-footer">
          <div>
            <h3>Need to jump deeper?</h3>
            <p>{footerNote}</p>
          </div>
          {footerAction && (
            <Button
              variant="outline"
              icon={<MdOpenInNew />}
              onClick={() => navigate(footerAction.to)}
            >
              {footerAction.label}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};