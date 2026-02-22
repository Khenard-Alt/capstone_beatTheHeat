# Project Documentation

## System Architecture

### Overview
The Beat The Heat system consists of three main components:
1. Backend API (Node.js + Express)
2. Frontend Web Application (React)
3. Database (Supabase/PostgreSQL)

### Data Flow
1. Weather data is fetched from external API
2. Heat index is calculated using weather data
3. AI analyzes heat index and generates health advisories
4. Notifications are sent to users based on advisory levels
5. Dashboard displays real-time data

### Database Schema
See database/schema.sql for complete schema

### API Documentation
See backend/README.md for API endpoints

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Write tests for critical functions
- Use meaningful variable and function names

### Git Workflow
1. Create feature branch from main
2. Make changes and commit with descriptive messages
3. Create pull request for review
4. Merge after approval

### Testing
- Write unit tests for services and utilities
- Write integration tests for API endpoints
- Maintain test coverage above 70%

## Deployment

### Production Checklist
- [ ] Update environment variables
- [ ] Run database migrations
- [ ] Build frontend and backend
- [ ] Configure SSL/TLS
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
