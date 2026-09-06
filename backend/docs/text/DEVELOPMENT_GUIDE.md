# DEVELOPMENT GUIDE

## Getting Started with Development

---

## 🔧 ENVIRONMENT SETUP

### Required Software
1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **Git**
   - Download from: https://git-scm.com/
   - Verify: `git --version`

3. **VS Code** (Recommended)
   - Download from: https://code.visualstudio.com/
   - Recommended Extensions:
     - ESLint
     - Prettier
     - TypeScript and JavaScript Language Features
     - ES7+ React/Redux/React-Native snippets

### Accounts Needed
- [ ] GitHub account
- [ ] Supabase account
- [ ] OpenWeatherMap account (for API key)
- [ ] OpenAI account (optional, for AI features)

---

## 📝 CODING STANDARDS

### Naming Conventions

#### Files
- React Components: `PascalCase.tsx` (e.g., `HeatIndexCard.tsx`)
- Services: `camelCase.service.ts` (e.g., `weather.service.ts`)
- Utils: `camelCase.ts` (e.g., `helpers.ts`)
- CSS files: Match component name (e.g., `HeatIndexCard.css`)

#### Variables and Functions
```typescript
// Variables - camelCase
const userName = "John";
const isActive = true;

// Functions - camelCase
function calculateHeatIndex() {}
const getData = () => {};

// Constants - UPPER_SNAKE_CASE
const API_URL = "https://api.example.com";
const MAX_RETRY_COUNT = 3;

// Classes - PascalCase
class UserService {}

// Interfaces/Types - PascalCase with I prefix (optional)
interface IUser {}
type UserRole = "admin" | "teacher";
```

### Code Structure

#### Component Structure
```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import './ComponentName.css';

// 2. Types/Interfaces
interface Props {
  title: string;
  onSubmit: () => void;
}

// 3. Component
export const ComponentName: React.FC<Props> = ({ title, onSubmit }) => {
  // 4. State
  const [data, setData] = useState([]);
  
  // 5. Effects
  useEffect(() => {
    // Effect logic
  }, []);
  
  // 6. Handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // 7. Render helpers (if needed)
  const renderItem = (item) => {
    return <div>{item.name}</div>;
  };
  
  // 8. Return JSX
  return (
    <div className="component-name">
      <h1>{title}</h1>
      {/* More JSX */}
    </div>
  );
};
```

#### Service Structure
```typescript
// 1. Imports
import axios from 'axios';
import { API_URL } from '../utils/constants';

// 2. Types
interface ServiceResponse {
  data: any;
  error?: string;
}

// 3. Service class or functions
export class WeatherService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = API_URL;
  }
  
  async getCurrentWeather(): Promise<ServiceResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`);
      return { data: response.data };
    } catch (error) {
      return { data: null, error: error.message };
    }
  }
}

// Or functional approach
export const getCurrentWeather = async (): Promise<ServiceResponse> => {
  // Implementation
};
```

---

## 🎨 CSS GUIDELINES

### CSS Organization
```css
/* 1. Layout */
.component {
  display: flex;
  position: relative;
}

/* 2. Box model */
.component {
  width: 100%;
  padding: 1rem;
  margin: 0 auto;
}

/* 3. Visual */
.component {
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 8px;
}

/* 4. Typography */
.component {
  font-size: 16px;
  color: #333;
  text-align: center;
}

/* 5. Transitions */
.component {
  transition: all 0.3s ease;
}
```

### BEM Naming (Recommended)
```css
/* Block */
.heat-index-card {}

/* Element */
.heat-index-card__header {}
.heat-index-card__body {}
.heat-index-card__footer {}

/* Modifier */
.heat-index-card--danger {}
.heat-index-card--warning {}
```

---

## 🔍 CODE REVIEW CHECKLIST

### Before Committing
- [ ] Code follows naming conventions
- [ ] No console.logs left in code (unless necessary)
- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Code is properly formatted (Prettier)
- [ ] Unused imports removed
- [ ] Comments added for complex logic
- [ ] TODOs documented if any

### Before Pull Request
- [ ] Code tested locally
- [ ] All tests passing
- [ ] No breaking changes (or documented)
- [ ] README updated if needed
- [ ] Screenshots added (for UI changes)
- [ ] Merge conflicts resolved

---

## 🧪 TESTING GUIDELINES

### Unit Test Example
```typescript
import { calculateHeatIndex } from './heatIndex.service';

describe('Heat Index Service', () => {
  describe('calculateHeatIndex', () => {
    it('should calculate heat index correctly', () => {
      const result = calculateHeatIndex(30, 70);
      expect(result).toBeGreaterThan(30);
    });
    
    it('should handle invalid input', () => {
      expect(() => calculateHeatIndex(-1, 70)).toThrow();
    });
  });
});
```

### Test Coverage Goals
- Services: 80% minimum
- Utils: 90% minimum
- Components: 60% minimum
- Overall: 75% minimum

---

## 📦 GIT WORKFLOW

### Branch Strategy
```
main (production)
  └── develop (integration)
       ├── feature/heat-index-calculation
       ├── feature/user-authentication
       ├── bugfix/notification-error
       └── hotfix/critical-security-issue
```

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add JWT authentication

- Implemented JWT token generation
- Added middleware for token validation
- Created refresh token endpoint

Closes #123
```

```
fix(weather): handle API timeout error

Added try-catch block and proper error handling
for weather API timeout scenarios.

Fixes #456
```

### Branch Naming
```
feature/add-notification-system
bugfix/fix-heat-index-calculation
hotfix/security-patch
docs/update-api-documentation
```

---

## 🐛 DEBUGGING TIPS

### Console Logging
```typescript
// Development only
console.log('[DEBUG] User data:', userData);
console.error('[ERROR] API call failed:', error);
console.warn('[WARN] Deprecated function used');

// Use debugger
debugger; // Will pause execution in browser DevTools
```

### React DevTools
- Install React Developer Tools extension
- Inspect component props and state
- Track re-renders

### Network Debugging
- Use browser Network tab
- Check request/response
- Verify headers and payload

### Common Issues

#### Issue: Module not found
**Solution:**
```bash
rm -rf node_modules
npm ci
```

#### Issue: Port already in use
**Solution:**
```bash
# Find process using port
lsof -i :3000    # Mac/Linux
netstat -ano | findstr :3000    # Windows

# Kill process
kill -9 <PID>    # Mac/Linux
taskkill /F /PID <PID>    # Windows
```

#### Issue: TypeScript errors
**Solution:**
- Check type definitions
- Verify import paths
- Clear TypeScript cache: `rm -rf node_modules/.cache`

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] API keys set up
- [ ] Error tracking configured
- [ ] Performance optimized
- [ ] Security audit completed

### Deployment Steps
1. Build production bundle
2. Run database migrations
3. Deploy backend
4. Deploy frontend
5. Test production environment
6. Monitor for errors

### Post-Deployment
- [ ] Verify all features working
- [ ] Check logs for errors
- [ ] Monitor performance
- [ ] Backup database
- [ ] Document any issues

---

## 📚 USEFUL RESOURCES

### Learning Resources
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Supabase Tutorials](https://supabase.com/docs/guides/getting-started)

### Tools
- [Postman](https://www.postman.com/) - API testing
- [DBeaver](https://dbeaver.io/) - Database management
- [Figma](https://www.figma.com/) - UI design

### Communities
- Stack Overflow
- Dev.to
- GitHub Discussions
- Discord developer communities

---

**Last Updated**: February 23, 2026
