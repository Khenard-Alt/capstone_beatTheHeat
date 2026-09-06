# AI-INTEGRATED SMART HEAT INDEX AND REAL-TIME HEALTH ADVISORY SYSTEM

**Capstone Project Documentation**

---

## 📋 PROJECT INFORMATION

### Project Title
AI-Integrated Smart Heat Index and Real-Time Health Advisory System

### Beneficiary
[To be determined - School/Institution Name]

### Project Type
Web-based Application System

### Development Period
February 2026 - [End Date]

---

## 👥 TEAM INFORMATION

### Project Team
- **Team Leader**: [Name]
- **Member 1**: [Name]
- **Member 2**: [Name]
- **Member 3**: [Name]

### Advisers
- **Technical Adviser**: [Name]
- **Subject Matter Expert**: [Name]

---

## 📖 EXECUTIVE SUMMARY

This capstone project aims to develop an AI-integrated smart system that monitors heat index levels in real-time and provides health advisories to educational institutions. The system utilizes weather data APIs, AI analysis, and automated notification systems to ensure the safety and well-being of students and staff during extreme heat conditions.

---

## 🎯 PROJECT OBJECTIVES

### General Objective
To develop an intelligent web-based system that monitors heat index levels and provides real-time health advisories to educational institutions.

### Specific Objectives
1. To integrate weather API services for real-time temperature and humidity data collection
2. To implement AI-powered analysis for heat index calculations and health risk assessment
3. To develop an automated notification system for timely health advisory distribution
4. To create a user-friendly dashboard for monitoring heat index trends and historical data
5. To provide school administrators with tools for managing health protocols based on heat levels
6. To ensure data security and privacy through proper authentication and authorization mechanisms

---

## 🌟 FEATURES AND FUNCTIONALITIES

### Core Features

#### 1. Real-Time Heat Index Monitoring
- Automatic weather data retrieval from external APIs
- Heat index calculation using temperature and humidity
- Live dashboard display with color-coded alerts
- Historical data tracking and visualization

#### 2. AI-Powered Health Advisory Generation
- Machine learning analysis of heat patterns
- Intelligent risk assessment based on historical data
- Personalized health recommendations
- Predictive alerts for upcoming heat events

#### 3. Multi-Channel Notification System
- Email notifications for administrators
- SMS alerts for critical heat levels
- In-app push notifications
- Customizable notification preferences

#### 4. User Management
- Role-based access control (Admin, Teacher, Staff)
- User authentication and authorization
- Profile management
- Activity logging

#### 5. School Management
- Multiple school support
- School-specific settings and thresholds
- Department/grade level categorization
- Custom heat index policies per school

#### 6. Data Visualization
- Interactive charts and graphs
- Heat index trends over time
- Comparison views (daily, weekly, monthly)
- Exportable reports

#### 7. Administrative Tools
- System configuration
- User management
- Notification template management
- Audit logs and system monitoring

---

## 💻 TECHNOLOGY STACK

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router
- **State Management**: Context API
- **HTTP Client**: Axios
- **UI Components**: Custom components with CSS modules
- **Icons**: React Icons
- **Charts**: Recharts
- **Date Handling**: date-fns

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Email Service**: Nodemailer
- **SMS Service**: Twilio (optional)
- **Validation**: Custom validators
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier

### Database
- **Primary Database**: Supabase (PostgreSQL)
- **ORM/Client**: Supabase JavaScript Client
- **Features Used**:
  - Row Level Security (RLS)
  - Database Functions
  - Triggers
  - Views
  - Indexes

### External APIs
- **Weather Data**: OpenWeatherMap API
- **AI/ML**: OpenAI API (GPT-4)

### DevOps & Deployment
- **Containerization**: Docker & Docker Compose
- **Version Control**: Git
- **CI/CD**: [To be determined]
- **Hosting**: [To be determined]

---

## 🏗️ SYSTEM ARCHITECTURE

### Architecture Pattern
- **Frontend**: Component-based architecture
- **Backend**: MVC (Model-View-Controller) pattern
- **Database**: Relational database with normalized schema
- **API**: RESTful API design

### System Components

#### 1. Presentation Layer (Frontend)
```
- User Interface Components
- State Management
- API Communication
- Client-side Validation
```

#### 2. Application Layer (Backend)
```
- Controllers (Request Handlers)
- Services (Business Logic)
- Middleware (Authentication, Validation, Error Handling)
- Routes (API Endpoints)
```

#### 3. Data Layer
```
- Database Models
- Supabase Client
- Data Access Functions
- Migrations
```

#### 4. Integration Layer
```
- Weather API Service
- AI Analysis Service
- Email/SMS Services
- Scheduler Service
```

---

## 📊 DATABASE SCHEMA

### Tables

#### 1. users
- User authentication and profile information
- Fields: id, email, password_hash, role, school_id, created_at, updated_at

#### 2. schools
- School/institution information
- Fields: id, name, address, contact, heat_threshold_settings, created_at

#### 3. heat_index_data
- Historical heat index records
- Fields: id, school_id, temperature, humidity, heat_index, timestamp

#### 4. weather_data
- Raw weather data from API
- Fields: id, school_id, api_response, temperature, humidity, conditions, timestamp

#### 5. health_advisories
- Generated health advisories and alerts
- Fields: id, school_id, heat_level, advisory_text, risk_level, created_at

#### 6. notifications
- Notification logs and history
- Fields: id, user_id, type, title, message, status, sent_at

#### 7. ai_analysis_logs
- AI analysis history and results
- Fields: id, input_data, output_data, model_used, timestamp

#### 8. user_preferences
- User-specific settings
- Fields: id, user_id, email_notifications, sms_notifications, theme

---

## 🔐 SECURITY FEATURES

### Authentication & Authorization
- JWT-based authentication
- Secure password hashing using bcrypt
- Role-based access control (RBAC)
- Session management
- Token expiration and refresh

### Data Security
- Supabase Row Level Security (RLS)
- SQL injection prevention
- XSS protection
- CORS configuration
- Input validation and sanitization
- Rate limiting on API endpoints

### Privacy
- User data encryption
- Secure environment variables
- HTTPS enforcement (production)
- Audit logging

---

## 🔌 API ENDPOINTS

### Authentication
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - User login
POST   /api/auth/logout        - User logout
GET    /api/auth/me            - Get current user
POST   /api/auth/refresh       - Refresh token
```

### Heat Index
```
GET    /api/heat-index         - Get current heat index
GET    /api/heat-index/history - Get historical data
POST   /api/heat-index/calculate - Manual calculation
```

### Health Advisory
```
GET    /api/health-advisory    - Get current advisories
GET    /api/health-advisory/:id - Get specific advisory
POST   /api/health-advisory    - Create advisory (Admin)
PUT    /api/health-advisory/:id - Update advisory (Admin)
DELETE /api/health-advisory/:id - Delete advisory (Admin)
```

### Weather
```
GET    /api/weather/current    - Get current weather
GET    /api/weather/forecast   - Get forecast
POST   /api/weather/refresh    - Force refresh
```

### Schools
```
GET    /api/schools            - Get all schools
GET    /api/schools/:id        - Get specific school
POST   /api/schools            - Create school (Admin)
PUT    /api/schools/:id        - Update school (Admin)
DELETE /api/schools/:id        - Delete school (Admin)
```

### Notifications
```
GET    /api/notifications      - Get user notifications
POST   /api/notifications/send - Send notification (Admin)
PATCH  /api/notifications/:id/read - Mark as read
DELETE /api/notifications/:id - Delete notification
```

### Users
```
GET    /api/users              - Get all users (Admin)
GET    /api/users/:id          - Get user profile
PUT    /api/users/:id          - Update user
DELETE /api/users/:id          - Delete user (Admin)
```

---

## 📁 PROJECT STRUCTURE

```
beatTheHeat/
├── backend/                    # Backend API
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Express middleware
│   │   ├── models/            # Database models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Utility functions
│   │   ├── types/             # TypeScript types
│   │   └── index.ts           # Entry point
│   ├── database/              # Database files
│   │   ├── migrations/        # SQL migrations
│   │   ├── seeds/             # Seed data
│   │   ├── functions/         # DB functions
│   │   ├── triggers/          # DB triggers
│   │   └── policies/          # RLS policies
│   └── docs/                  # Documentation
├── frontend/                   # Frontend application
│   └── src/
│       ├── components/        # Reusable components
│       ├── pages/             # Page components
│       ├── services/          # API services
│       ├── context/           # React context
│       ├── hooks/             # Custom hooks
│       ├── styles/            # CSS files
│       └── utils/             # Utilities
└── docs/                       # Project documentation
```

---

## 🚀 INSTALLATION AND SETUP

### Prerequisites
- Node.js v18 or higher
- npm or yarn
- Supabase account
- Weather API key (OpenWeatherMap)
- OpenAI API key (optional)

### Backend Setup
```bash
cd backend
npm ci
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm ci
cp .env.example .env
# Edit .env with API URL
npm run dev
```

### Database Setup
1. Create Supabase project
2. Run migrations in order (001, 002, 003...)
3. Apply RLS policies
4. Load seed data (optional)

---

## 🧪 TESTING STRATEGY

### Unit Testing
- Service functions
- Utility functions
- Model methods
- Components (React Testing Library)

### Integration Testing
- API endpoints
- Database operations
- Authentication flow
- Notification system

### User Acceptance Testing
- Manual testing by end users
- Feedback collection
- Bug reporting and fixes
- Performance testing

---

## 📈 PROJECT TIMELINE

### Phase 1: Planning & Design (Week 1-2)
- Requirements gathering
- System design
- Database schema design
- UI/UX mockups

### Phase 2: Development - Backend (Week 3-5)
- Database setup
- API development
- Authentication system
- Business logic implementation

### Phase 3: Development - Frontend (Week 6-8)
- Component development
- Page layouts
- API integration
- Responsive design

### Phase 4: Integration & Testing (Week 9-10)
- System integration
- Testing (unit, integration)
- Bug fixes
- Performance optimization

### Phase 5: Deployment & Documentation (Week 11-12)
- Deployment setup
- User documentation
- Technical documentation
- Final presentation preparation

---

## 📊 EXPECTED OUTCOMES

### Technical Outcomes
1. Fully functional web-based heat index monitoring system
2. Integration with third-party weather APIs
3. AI-powered health advisory generation
4. Automated notification system
5. Secure and scalable architecture

### Business Outcomes
1. Improved health and safety protocols in schools
2. Proactive response to heat-related risks
3. Better decision-making for school administrators
4. Reduced heat-related health incidents
5. Enhanced awareness of climate conditions

---

## 🎓 LEARNING OUTCOMES

### Technical Skills
- Full-stack web development
- API integration
- Database design and management
- AI/ML implementation
- Security best practices
- Testing and debugging

### Soft Skills
- Project management
- Team collaboration
- Problem-solving
- Documentation
- Presentation skills

---

## 📚 REFERENCES

### Technologies Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenWeatherMap API](https://openweathermap.org/api)
- [OpenAI API Documentation](https://platform.openai.com/docs)

### Research Papers & Articles
[To be added based on research conducted]

---

## 📝 NOTES AND OBSERVATIONS

### Challenges Encountered
[To be documented during development]

### Solutions Implemented
[To be documented during development]

### Future Enhancements
1. Mobile application development
2. Integration with more weather services
3. Advanced AI predictions using historical patterns
4. Real-time collaboration features
5. Multi-language support
6. Offline mode capabilities

---

## 📞 CONTACT INFORMATION

### Project Team
- Email: [team-email@example.com]
- GitHub: [repository-link]

### Institution
- School: [School Name]
- Department: [Department Name]
- Contact: [contact-info]

---

## 📄 APPENDICES

### Appendix A: User Manual
[Link to detailed user manual]

### Appendix B: Technical Specifications
[Link to technical specifications document]

### Appendix C: API Documentation
[Link to API documentation]

### Appendix D: Database Schema Diagram
[Link to database schema diagram]

---

**Document Version**: 1.0  
**Last Updated**: February 23, 2026  
**Status**: In Development
