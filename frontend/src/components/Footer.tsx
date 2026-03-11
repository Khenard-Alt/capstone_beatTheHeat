import React from 'react';
import { Link } from 'react-router-dom';
import { SCHOOL_INFO } from '../utils/constants';
import '../styles/Footer.css';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">{SCHOOL_INFO.NAME}</h3>
          <p className="footer-text">{SCHOOL_INFO.ADDRESS}</p>
          <p className="footer-text">{SCHOOL_INFO.CONTACT}</p>
          <p className="footer-text">{SCHOOL_INFO.EMAIL}</p>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Quick Links</h4>
          <ul className="footer-links">
            <li>
              <Link to="/">Dashboard</Link>
            </li>
            <li>
              <Link to="/heat-index">Heat Index</Link>
            </li>
            <li>
              <Link to="/health-advisory">Health Advisory</Link>
            </li>
            <li>
              <Link to="/notifications">Notifications</Link>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Resources</h4>
          <ul className="footer-links">
            <li>
              <a href="#" target="_blank" rel="noopener noreferrer">
                DepEd Guidelines
              </a>
            </li>
            <li>
              <a href="#" target="_blank" rel="noopener noreferrer">
                Heat Safety Tips
              </a>
            </li>
            <li>
              <a href="#" target="_blank" rel="noopener noreferrer">
                Emergency Contacts
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">About</h4>
          <p className="footer-description">
            AI-Integrated Smart Heat Index and Real-Time Health Advisory System
            designed to protect students and staff from heat-related risks.
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          &copy; {currentYear} {SCHOOL_INFO.NAME}. All rights reserved.
        </p>
        <p className="footer-powered">
          Powered by Capstone Project Team
        </p>
      </div>
    </footer>
  );
};
