import React from 'react';
import { Card } from '../../components/Card';
import '../../styles/AdminDashboard.css';

const Chatbot: React.FC = () => {
  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Chatbot</h1>
          <p>Access the Smart Advisory chatbot for guidance on heat-related incidents.</p>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <Card title="Smart Advisory Bot">
          <div style={{ padding: 12 }}>
            <p>The chatbot is available in the lower-right corner. Use it to ask for recommended actions.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Chatbot;
