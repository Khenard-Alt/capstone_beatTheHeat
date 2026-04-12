# AI-Integrated Smart Heat Index and Real-Time Health Advisory System for Mayamot Elementary School

**Project Scope Documentation**  
**Date**: February 26, 2026  
**Version**: 1.0

---

## 📋 PROJECT OVERVIEW

### Project Title
**AI-Integrated Smart Heat Index and Real-Time Health Advisory System for Mayamot Elementary School**

### Beneficiary
**Mayamot Elementary School**

### Project Duration
**February 2026 - June 2026** (Approximately 4-5 months)

### Project Type
Full-Stack Web Application with AI Integration

**AI Integration Clarification (Adviser-Facing)**
The system uses an API-based AI service (e.g., OpenAI GPT-4) for advisory generation and pattern analysis, and its outputs are strictly limited to system data and weather inputs (temperature, humidity, computed heat index, and related records stored in the project). The AI does not pull in external knowledge or answer beyond what exists in the system. This approach integrates established AI capabilities without training a custom model. Model training or fine-tuning is not required unless explicitly mandated by the project scope or adviser.

---

## 🎯 PROJECT OBJECTIVES

### Primary Objective
To develop and deploy an intelligent web-based system that monitors real-time heat index levels and provides automated health advisories to protect students, teachers, and staff of Mayamot Elementary School from heat-related health risks.

### Specific Objectives
1. **Real-Time Monitoring**: Implement automated weather data collection and heat index calculation for Mayamot Elementary School location
2. **AI-Powered Analysis**: Integrate AI capabilities to analyze heat patterns and generate intelligent health advisories
3. **Automated Notifications**: Develop multi-channel notification system (email, SMS, in-app) for timely alerts
4. **User Management**: Create role-based access system for school administrators, teachers, and staff
5. **Data Visualization**: Build interactive dashboards showing current conditions, trends, and historical data
6. **Health Protocol Integration**: Provide actionable recommendations aligned with DepEd heat index protocols

---

## 🔍 PROJECT SCOPE

### In-Scope Features

#### 1. Authentication & User Management
- ✅ User registration and login system
- ✅ Role-based access control (Admin, Teacher, Staff)
- ✅ Password reset and recovery
- ✅ User profile management
- ✅ Session management with JWT tokens

#### 2. Weather Data Integration
- ✅ Real-time weather data from OpenWeatherMap API
- ✅ Automatic data fetching every 15-30 minutes
- ✅ Temperature, humidity, and weather condition tracking
- ✅ Geolocation-specific data for Mayamot Elementary School
- ✅ Historical weather data storage

#### 3. Heat Index Calculation & Monitoring
- ✅ Automated heat index calculation (Temperature + Humidity)
- ✅ Real-time heat index display on dashboard
- ✅ Color-coded alert levels (Normal, Caution, Extreme Caution, Danger, Extreme Danger)
- ✅ Historical heat index data tracking
- ✅ Trend analysis (daily, weekly, monthly views)

#### 4. AI-Powered Health Advisory System
- ✅ AI analysis using OpenAI GPT-4 API
- ✅ Intelligent health advisory generation based on:
  - Current heat index level
  - Historical patterns
  - Time of day
  - School activities schedule
- ✅ Personalized recommendations for different user roles
- ✅ Predictive alerts for upcoming heat events

#### 5. Notification System
- ✅ Email notifications to all registered users
- ✅ SMS alerts (optional, for critical situations)
- ✅ In-app push notifications
- ✅ Customizable notification preferences per user
- ✅ Notification history and logs
- ✅ Different notification levels based on heat severity

#### 6. Dashboard & Data Visualization
- ✅ Real-time heat index display with color indicators
- ✅ Current weather conditions widget
- ✅ Interactive charts and graphs (Line, Bar, Area charts)
- ✅ Historical data comparison
- ✅ Daily, weekly, and monthly trend views
- ✅ Health advisory display panel
- ✅ Quick action buttons for administrators

#### 7. School Profile Management
- ✅ School information management (name, address, contact)
- ✅ Customizable heat index thresholds
- ✅ School-specific settings and preferences
- ✅ Class schedule integration (optional)
- ✅ Emergency contact information

#### 8. Administrative Features
- ✅ User management (add, edit, delete users)
- ✅ View all users and their roles
- ✅ System configuration settings
- ✅ Notification management
- ✅ Manual advisory creation/override
- ✅ Activity logs and audit trails
- ✅ System health monitoring

#### 9. Reporting & Analytics
- ✅ Generate heat index reports (daily, weekly, monthly)
- ✅ Advisory history reports
- ✅ User activity reports
- ✅ Export data to CSV/Excel
- ✅ Print-friendly report formats

#### 10. Security Features
- ✅ Secure authentication with bcrypt password hashing
- ✅ JWT token-based session management
- ✅ Row-level security (RLS) in database
- ✅ Input validation and sanitization
- ✅ Rate limiting on API endpoints
- ✅ CORS configuration
- ✅ SQL injection prevention
- ✅ XSS protection

### Out-of-Scope Features
- ❌ Mobile native applications (iOS/Android)
- ❌ Multiple school support (single school focus: Mayamot Elementary)
- ❌ Real-time video streaming
- ❌ Student attendance tracking system
- ❌ Full Learning Management System (LMS) integration
- ❌ Payment processing
- ❌ Social media features
- ❌ Multi-language support (English only)
- ❌ Offline mobile app capabilities

### Future Enhancement Possibilities
- 📱 Mobile application development
- 🏫 Multiple school support
- 🌐 Multi-language support (Filipino, English)
- 📊 Advanced predictive analytics using machine learning
- 📅 Calendar integration for school events
- 🚨 Integration with local weather stations
- 🔔 Voice announcement integration
- 🌤️ Integration with additional weather APIs (backup)

---

## 🛠️ TECHNICAL SCOPE

### Frontend Development
**Framework**: React 19 with TypeScript
- Modern, component-based UI architecture
- Responsive design for desktop, tablet, and mobile browsers
- Real-time data updates
- Interactive charts and visualizations
- Form validation and error handling
- Loading states and user feedback
- Accessibility features (WCAG compliance)

### Backend Development
**Framework**: Node.js + Express.js with TypeScript
- RESTful API architecture
- JWT authentication middleware
- Input validation and sanitization
- Error handling and logging
- Rate limiting and security measures
- Scheduled tasks for weather data fetching
- Email service integration
- SMS service integration (optional)

### Database
**Platform**: Supabase (PostgreSQL)
- Relational database design
- 8 main tables:
  1. users (authentication and profiles)
  2. schools (school information)
  3. heat_index_data (historical records)
  4. weather_data (raw API data)
  5. health_advisories (generated advisories)
  6. notifications (notification logs)
  7. ai_analysis_logs (AI usage tracking)
  8. user_preferences (user settings)
- Database functions for heat index calculation
- Triggers for automatic notifications
- Views for summary data
- Indexes for performance optimization
- Row-level security (RLS) policies

### External API Integrations
1. **OpenWeatherMap API**
   - Current weather data
   - Forecast data (optional)
   - Geolocation-based queries

2. **OpenAI API (GPT-4)**
   - Health advisory generation
   - Pattern analysis
   - Intelligent recommendations

3. **Email Service** (Nodemailer + SMTP)
   - Transactional emails
   - Notification emails
   - System alerts

4. **SMS Service** (Twilio - Optional)
   - Critical alerts only
   - Emergency notifications

### DevOps & Deployment
- Docker containerization
- Docker Compose for local development
- Environment variable management
- Git version control
- Testing suite (unit and integration tests)
- CI/CD pipeline setup (optional)

---

## 👥 USER ROLES & PERMISSIONS

### 1. Administrator (Admin)
**Full System Access**
- ✅ Manage all users (create, edit, delete)
- ✅ Configure system settings
- ✅ Manage school profile
- ✅ Set heat index thresholds
- ✅ Create/edit manual advisories
- ✅ View all logs and reports
- ✅ Send manual notifications
- ✅ Access analytics and reports
- ✅ Manage notification templates

### 2. Teacher
**Standard User Access**
- ✅ View dashboard and current heat index
- ✅ View health advisories
- ✅ Receive notifications
- ✅ View historical data and trends
- ✅ Update own profile
- ✅ Customize notification preferences
- ✅ View reports (read-only)
- ❌ Cannot manage other users
- ❌ Cannot change system settings

### 3. Staff
**Basic User Access**
- ✅ View current heat index
- ✅ View health advisories
- ✅ Receive notifications
- ✅ Update own profile
- ✅ Customize notification preferences
- ❌ Limited access to historical data
- ❌ Cannot manage users
- ❌ Cannot change settings

---

## 📊 FUNCTIONAL REQUIREMENTS

### FR-01: User Authentication
- Users must be able to register with email and password
- Users must be able to log in securely
- Users must be able to reset forgotten passwords
- System must maintain secure session management
- Users must be able to log out

### FR-02: Weather Data Collection
- System must automatically fetch weather data every 15-30 minutes
- System must store weather data in the database
- System must handle API failures gracefully
- System must log all API calls

### FR-03: Heat Index Calculation
- System must calculate heat index using temperature and humidity
- System must categorize heat index into 5 levels:
  - **Normal**: < 27°C (< 80°F)
  - **Caution**: 27-32°C (80-90°F)
  - **Extreme Caution**: 32-41°C (90-105°F)
  - **Danger**: 41-54°C (105-130°F)
  - **Extreme Danger**: > 54°C (> 130°F)
- System must update heat index display in real-time

### FR-04: Health Advisory Generation
- System must generate advisories automatically when heat index changes significantly
- System must use AI to create contextually relevant advisories
- System must include actionable recommendations
- System must reference DepEd heat index protocols

### FR-05: Notification System
- System must send notifications based on heat index thresholds
- Users must be able to choose notification preferences
- System must track notification delivery status
- System must not spam users with duplicate notifications

### FR-06: Dashboard Display
- Dashboard must show current heat index prominently
- Dashboard must display color-coded status indicators
- Dashboard must show current weather conditions
- Dashboard must display latest health advisory
- Dashboard must show data visualizations (charts)

### FR-07: User Management (Admin Only)
- Admins must be able to create new user accounts
- Admins must be able to edit user roles
- Admins must be able to deactivate/delete users
- Admins must be able to view user activity logs

### FR-08: Reporting
- System must generate daily heat index reports
- System must generate weekly trend reports
- Users must be able to export reports to CSV
- System must provide print-friendly report formats

---

## 🎨 NON-FUNCTIONAL REQUIREMENTS

### Performance
- ⚡ Dashboard must load within 2 seconds
- ⚡ API responses must return within 1 second (95th percentile)
- ⚡ System must support 100 concurrent users
- ⚡ Weather data fetch must complete within 5 seconds

### Security
- 🔒 All passwords must be hashed using bcrypt
- 🔒 All API endpoints (except public) must require authentication
- 🔒 System must implement rate limiting (100 requests/15min per user)
- 🔒 All user inputs must be validated and sanitized
- 🔒 HTTPS must be enforced in production

### Reliability
- ✅ System uptime target: 99% (downtime < 7 hours/month)
- ✅ Database must be backed up daily
- ✅ System must handle API failures without crashing
- ✅ System must log all errors for debugging

### Usability
- 👥 Interface must be intuitive and user-friendly
- 👥 System must work on modern browsers (Chrome, Firefox, Edge, Safari)
- 👥 Interface must be responsive (mobile, tablet, desktop)
- 👥 System must provide helpful error messages

### Maintainability
- 🔧 Code must follow TypeScript best practices
- 🔧 Code must be well-documented with comments
- 🔧 Code must have minimum 70% test coverage
- 🔧 System must use environment variables for configuration

### Scalability
- 📈 Database design must support adding more schools in future
- 📈 Architecture must allow adding new notification channels
- 📈 System must allow adding new weather data sources

---

## 📅 PROJECT PHASES & DELIVERABLES

### Phase 1: Planning & Design (Week 1-2)
**Deliverables:**
- ✅ Complete project documentation
- ✅ Database schema design
- ✅ API endpoint specifications
- ✅ UI/UX wireframes and mockups
- ✅ Technical architecture diagram
- ✅ Project timeline and milestones

### Phase 2: Backend Development (Week 3-6)
**Deliverables:**
- ✅ Database setup and migrations
- ✅ User authentication system
- ✅ Weather API integration
- ✅ Heat index calculation service
- ✅ AI advisory generation service
- ✅ Notification service (email)
- ✅ All API endpoints functional
- ✅ Unit tests for backend services

### Phase 3: Frontend Development (Week 7-10)
**Deliverables:**
- ✅ All UI components built
- ✅ All pages implemented
- ✅ Dashboard with real-time updates
- ✅ User management interface (admin)
- ✅ Settings and preferences pages
- ✅ Responsive design implementation
- ✅ Frontend integration with backend APIs

### Phase 4: Integration & Testing (Week 11-13)
**Deliverables:**
- ✅ Full system integration
- ✅ End-to-end testing
- ✅ Bug fixes and optimization
- ✅ Security testing and hardening
- ✅ Performance testing
- ✅ User acceptance testing with school stakeholders

### Phase 5: Deployment & Documentation (Week 14-16)
**Deliverables:**
- ✅ Production deployment
- ✅ Complete user documentation
- ✅ Admin training materials
- ✅ Technical documentation
- ✅ Maintenance guide
- ✅ Final project presentation

### Phase 6: Training & Handover (Week 17-18)
**Deliverables:**
- ✅ User training sessions for Mayamot Elementary School staff
- ✅ Admin training for school administrators
- ✅ System handover documentation
- ✅ Support period (1 month post-deployment)

---

## 🎯 SUCCESS CRITERIA

### Technical Success Metrics
- ✅ All functional requirements implemented and tested
- ✅ System passes security audit
- ✅ Zero critical bugs in production
- ✅ API response times meet performance requirements
- ✅ 95%+ test coverage on core features
- ✅ 99% uptime during first month of operation

### Business Success Metrics
- ✅ System successfully deployed at Mayamot Elementary School
- ✅ At least 80% of school staff registered and using the system
- ✅ Positive feedback from school administrators and teachers
- ✅ Reduction in heat-related incidents (tracked over time)
- ✅ 90%+ notification delivery success rate
- ✅ System used daily by school staff

### User Satisfaction Metrics
- ✅ User satisfaction score: 4.0/5.0 or higher
- ✅ System perceived as helpful by 80%+ of users
- ✅ Low complaint/support ticket volume
- ✅ High engagement with dashboard (daily active users)

---

## 🚧 CONSTRAINTS & ASSUMPTIONS

### Constraints
- **Budget**: Limited budget for third-party services (API costs, hosting)
- **Timeline**: Must be completed within 4-5 months (capstone deadline)
- **Resources**: Student development team with limited availability
- **Technology**: Must use free or student-tier services
- **Single School**: Limited to Mayamot Elementary School only

### Assumptions
- School has reliable internet connectivity
- School staff have basic computer literacy
- School provides necessary information (location, contacts, schedules)
- Weather API and AI API remain available and stable
- School stakeholders are available for feedback and testing
- Email addresses are collected from all users for notifications

---

## ⚠️ RISKS & MITIGATION

### Risk 1: API Service Downtime
**Impact**: High  
**Probability**: Medium  
**Mitigation**:
- Implement caching mechanisms
- Add retry logic with exponential backoff
- Display last known data when API is down
- Consider backup weather API

### Risk 2: Budget Limitations for API Calls
**Impact**: High  
**Probability**: Medium  
**Mitigation**:
- Monitor API usage closely
- Optimize API call frequency
- Use free tier efficiently
- Implement API call limits

### Risk 3: User Adoption Challenges
**Impact**: Medium  
**Probability**: Medium  
**Mitigation**:
- Conduct thorough user training
- Create easy-to-follow user guides
- Make UI extremely intuitive
- Provide ongoing support

### Risk 4: Technical Complexity
**Impact**: High  
**Probability**: Low  
**Mitigation**:
- Break down tasks into manageable chunks
- Regular code reviews
- Maintain comprehensive documentation
- Seek adviser guidance when needed

### Risk 5: Data Security Breach
**Impact**: Critical  
**Probability**: Low  
**Mitigation**:
- Follow security best practices
- Regular security audits
- Implement proper authentication
- Use Supabase built-in security features

---

## 📞 STAKEHOLDERS

### Primary Stakeholders
- **Mayamot Elementary School Administration**: System beneficiary
- **School Principal**: Final decision maker
- **Teachers and Staff**: Primary system users
- **Development Team**: System developers
- **Project Adviser**: Technical guidance

### Secondary Stakeholders
- **Students**: Indirect beneficiaries 
- **Parents**: Indirect beneficiaries
- **DepEd Officials**: Policy alignment
- **School Community**: Overall benefit

---

## 📈 SUCCESS MONITORING

### Key Performance Indicators (KPIs)
1. **System Uptime**: Target 99%
2. **Daily Active Users**: Target 80% of registered users
3. **Notification Delivery Rate**: Target 95%+
4. **Average Response Time**: < 1 second
5. **User Satisfaction Score**: Target 4.0/5.0
6. **Heat Index Data Accuracy**: 95%+
7. **Advisory Generation Time**: < 2 seconds

### Monitoring Tools
- System logs for error tracking
- Google Analytics for user engagement
- Uptime monitoring service
- API usage dashboard
- User feedback forms

---

## 📝 ACCEPTANCE CRITERIA

The project will be considered complete when:
1. ✅ All in-scope features are implemented and functional
2. ✅ System is successfully deployed to production
3. ✅ All test cases pass (unit, integration, E2E)
4. ✅ Complete documentation delivered
5. ✅ User training completed
6. ✅ School administrators sign off on system
7. ✅ One week of stable production operation
8. ✅ Final capstone presentation completed

---

## 🎓 LEARNING OBJECTIVES

### Technical Skills
- Full-stack web development (React + Node.js)
- TypeScript programming
- RESTful API design and development
- Database design and management
- Authentication and security implementation
- AI/ML API integration
- DevOps and deployment practices

### Professional Skills
- Project management
- Team collaboration
- Client communication
- Requirements gathering
- Testing and quality assurance
- Documentation writing
- Problem-solving under constraints

---

## 📚 REFERENCES & RESOURCES

### Technical Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenWeatherMap API Docs](https://openweathermap.org/api)
- [OpenAI API Documentation](https://platform.openai.com/docs)

### DepEd Guidelines
- DepEd Heat Index Advisory Guidelines
- DepEd Order on Suspension of Classes
- Climate Change Adaptation Guidelines

### Project Management
- Agile/Scrum methodology
- Sprint planning and retrospectives
- Version control with Git
- Issue tracking

---

## 🔄 CHANGE MANAGEMENT

### Scope Change Process
1. Identify and document proposed change
2. Assess impact on timeline, budget, resources
3. Review with team and adviser
4. Get approval from stakeholders
5. Update project documentation
6. Communicate changes to all parties

### Version Control
- Git for source code management
- Semantic versioning (v1.0.0)
- Regular commits with clear messages
- Feature branches and pull requests

---

## 🎉 PROJECT COMPLETION

### Final Deliverables
1. ✅ Production-ready application
2. ✅ Complete source code (GitHub repository)
3. ✅ Database schema and migrations
4. ✅ API documentation
5. ✅ User manual
6. ✅ Technical documentation
7. ✅ Admin guide
8. ✅ Deployment guide
9. ✅ Project presentation
10. ✅ Capstone documentation

### Post-Deployment Support
- **Duration**: 1 month after deployment
- **Support Channels**: Email, phone
- **Bug Fixes**: Priority bugs will be fixed
- **Training**: Additional training if needed
- **Monitoring**: System health monitoring

---

## 📧 CONTACT INFORMATION

### Development Team
- **Project Lead**: [Name]
- **Email**: [email@example.com]
- **GitHub**: [repository-link]

### School Contact
- **School**: Mayamot Elementary School
- **Principal**: [Name]
- **Email**: [school-email@deped.gov.ph]
- **Contact**: [contact-number]

---

**Document Status**: ✅ Approved  
**Last Updated**: February 26, 2026  
**Next Review**: March 15, 2026  
**Version**: 1.0

---

*This project scope document serves as the official guideline for the development of the AI-Integrated Smart Heat Index and Real-Time Health Advisory System for Mayamot Elementary School. Any changes to this scope must go through the proper change management process.*
