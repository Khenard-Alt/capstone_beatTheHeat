import React from 'react';
import { Card } from '../../components/Card';
import '../../styles/AdminDashboard.css';

const PrincipalChatbot: React.FC = () => {
  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Principal Chatbot</h1>
          <p>Use the assistant for school-wide advisory guidance and report summaries.</p>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <Card title="Assistant">
          <div style={{ padding: 12 }}>
            <p>The chatbot is available in the bottom-right corner of the app.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PrincipalChatbot;
