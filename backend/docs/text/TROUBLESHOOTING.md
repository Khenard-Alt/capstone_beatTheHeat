# TROUBLESHOOTING GUIDE

## Common Issues and Solutions

---

## 🔧 INSTALLATION ISSUES

### Issue: npm install fails
**Symptoms:**
- Error during package installation
- Dependency conflicts
- Permission errors

**Solutions:**
```bash
# 1. Clear npm cache
npm cache clean --force

# 2. Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json  # Mac/Linux
Remove-Item -Recurse -Force node_modules, package-lock.json  # Windows PowerShell

# 3. Reinstall
npm install

# 4. Try with legacy peer deps (if conflicts persist)
npm install --legacy-peer-deps
```

### Issue: Node version mismatch
**Symptoms:**
- "Unsupported engine" error
- Compatibility warnings

**Solutions:**
```bash
# Check current Node version
node --version

# Install nvm (Node Version Manager)
# Then switch to compatible version
nvm install 18
nvm use 18
```

---

## 🗄️ DATABASE ISSUES

### Issue: Cannot connect to Supabase
**Symptoms:**
- Connection timeout
- Authentication failed
- Invalid API key error

**Solutions:**
1. Verify Supabase credentials in `.env`
2. Check if Supabase project is active
3. Verify API keys are correct
4. Check network/firewall settings

```typescript
// Test connection
import { supabase } from './config/supabase';

const testConnection = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('count');
  
  if (error) {
    console.error('Connection failed:', error);
  } else {
    console.log('Connection successful!');
  }
};
```

### Issue: Migration fails
**Symptoms:**
- SQL syntax errors
- Table already exists
- Foreign key constraint errors

**Solutions:**
1. Check SQL syntax
2. Run migrations in order
3. Drop and recreate if needed (development only!)
4. Check foreign key relationships

```sql
-- Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'users';

-- Drop table if needed (CAREFUL!)
DROP TABLE IF EXISTS users CASCADE;
```

### Issue: Row Level Security blocking queries
**Symptoms:**
- Empty results despite data existing
- Permission denied errors

**Solutions:**
1. Check RLS policies are set up correctly
2. Verify user authentication
3. Temporarily disable RLS for testing (development only)

```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Disable RLS (development only!)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

---

## 🌐 API ISSUES

### Issue: Weather API returns 401
**Symptoms:**
- Unauthorized error
- API key invalid

**Solutions:**
1. Verify API key in `.env` file
2. Check if API key is active
3. Verify API endpoint URL
4. Check rate limits

```typescript
// Test API key
const testWeatherAPI = async () => {
  const apiKey = process.env.WEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=Manila&appid=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('API test failed:', error);
  }
};
```

### Issue: CORS errors in browser
**Symptoms:**
- "Access to fetch blocked by CORS policy"
- Cross-origin request blocked

**Solutions:**
1. Enable CORS in backend:
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

2. For development, use proxy in `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
```

### Issue: API timeout
**Symptoms:**
- Request takes too long
- Connection timeout
- No response

**Solutions:**
1. Increase timeout:
```typescript
axios.defaults.timeout = 10000; // 10 seconds
```

2. Add retry logic:
```typescript
const fetchWithRetry = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};
```

---

## 🔐 AUTHENTICATION ISSUES

### Issue: JWT token invalid
**Symptoms:**
- 401 Unauthorized errors
- Token expired
- Invalid signature

**Solutions:**
1. Check JWT secret in `.env`
2. Verify token expiration time
3. Ensure token is properly stored and sent

```typescript
// Check token validity
import jwt from 'jsonwebtoken';

const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token valid:', decoded);
    return true;
  } catch (error) {
    console.error('Token invalid:', error.message);
    return false;
  }
};
```

### Issue: Password hashing fails
**Symptoms:**
- bcrypt errors
- Registration fails
- Login comparison fails

**Solutions:**
```typescript
import bcrypt from 'bcrypt';

// Correct usage
const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};
```

---

## ⚛️ REACT/FRONTEND ISSUES

### Issue: Component not re-rendering
**Symptoms:**
- UI not updating
- State changes not reflected
- Props not triggering re-render

**Solutions:**
1. Check if state is being mutated directly:
```typescript
// ❌ Wrong
state.items.push(newItem);

// ✅ Correct
setState({ ...state, items: [...state.items, newItem] });
```

2. Use useEffect dependencies correctly:
```typescript
useEffect(() => {
  fetchData();
}, [dependency]); // Include all dependencies
```

### Issue: "Cannot read property of undefined"
**Symptoms:**
- Runtime errors
- White screen
- Console errors

**Solutions:**
1. Use optional chaining:
```typescript
const value = data?.user?.name ?? 'Default';
```

2. Add null checks:
```typescript
if (!data || !data.user) return null;
```

3. Use default values:
```typescript
const { user = {} } = data;
```

### Issue: Infinite loop in useEffect
**Symptoms:**
- App freezes
- Too many renders error
- Memory issues

**Solutions:**
```typescript
// ❌ Wrong - missing dependencies or wrong dependencies
useEffect(() => {
  setState(newValue);
}, [newValue]); // newValue changes, causes re-render, infinite loop

// ✅ Correct
useEffect(() => {
  fetchData();
}, []); // Empty array = run once on mount
```

---

## 🎨 STYLING ISSUES

### Issue: CSS not loading
**Symptoms:**
- Styles not applied
- Component looks unstyled

**Solutions:**
1. Verify import:
```typescript
import './Component.css'; // Relative path
```

2. Check file naming matches
3. Clear cache and rebuild:
```bash
rm -rf node_modules/.vite
npm run dev
```

### Issue: CSS conflicts
**Symptoms:**
- Unexpected styling
- Styles overriding each other

**Solutions:**
1. Use more specific selectors
2. Use CSS modules:
```typescript
import styles from './Component.module.css';

<div className={styles.container}>
```

3. Use BEM naming convention
4. Check CSS specificity

---

## 🚀 DEPLOYMENT ISSUES

### Issue: Build fails
**Symptoms:**
- Build command errors
- TypeScript compilation errors
- Module not found

**Solutions:**
1. Fix all TypeScript errors
2. Check import paths
3. Verify all dependencies installed
4. Try clean build:
```bash
rm -rf dist
npm run build
```

### Issue: Environment variables not working in production
**Symptoms:**
- API calls fail
- Config values undefined

**Solutions:**
1. Ensure environment variables are set in hosting platform
2. For Vite, prefix with `VITE_`:
```env
VITE_API_URL=https://api.example.com
```

3. Check if env file is in .gitignore (it should be!)

### Issue: Production app slower than development
**Symptoms:**
- Long load times
- Lag in interactions

**Solutions:**
1. Enable code splitting
2. Lazy load components:
```typescript
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
```

3. Optimize images
4. Use CDN for static assets
5. Enable gzip compression

---

## 📱 MOBILE/RESPONSIVE ISSUES

### Issue: Layout breaks on mobile
**Symptoms:**
- Elements overlap
- Horizontal scroll appears
- Text too small/large

**Solutions:**
1. Use responsive units:
```css
/* ❌ Wrong */
width: 800px;

/* ✅ Correct */
width: 100%;
max-width: 800px;
```

2. Add viewport meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

3. Use media queries:
```css
@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }
}
```

---

## 🧪 TESTING ISSUES

### Issue: Tests failing
**Symptoms:**
- Test suite errors
- Unexpected results
- Timeout errors

**Solutions:**
1. Check test environment:
```bash
npm test -- --verbose
```

2. Mock external dependencies:
```typescript
jest.mock('./api', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: [] }))
}));
```

3. Increase test timeout:
```typescript
jest.setTimeout(10000);
```

---

## 🔍 DEBUGGING TOOLS

### Browser DevTools
- **Console**: View logs and errors
- **Network**: Monitor API calls
- **Elements**: Inspect DOM and styles
- **Application**: Check localStorage, cookies
- **Sources**: Set breakpoints

### VS Code Debugging
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "program": "${workspaceFolder}/backend/src/index.ts",
      "preLaunchTask": "tsc: build - backend/tsconfig.json",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"]
    }
  ]
}
```

### Logging Best Practices
```typescript
// Development
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG]', data);
}

// Production - use proper logging
import { logger } from './utils/logger';
logger.info('User logged in', { userId: user.id });
logger.error('API call failed', { error: error.message });
```

---

## 📞 GETTING HELP

### Before Asking for Help
1. Read error message carefully
2. Search on Google/Stack Overflow
3. Check documentation
4. Try debugging yourself
5. Document what you tried

### When Asking for Help
Include:
- Error message (full text)
- Code snippet (minimal reproducible example)
- What you expected vs what happened
- What you've already tried
- Environment info (OS, Node version, etc.)

### Useful Communities
- Stack Overflow
- GitHub Discussions
- Discord server  (if you have one)
- Local dev communities

---

## 📝 ERROR LOG TEMPLATE

When encountering errors, document them:

```markdown
## Error: [Brief description]

**Date**: [Date]
**Component/File**: [Location]

**Error Message**:
```
[Full error message]
```

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Solution**:
[How it was fixed]

**Prevented By**:
[How to avoid in future]
```

---

**Last Updated**: February 23, 2026  
**Maintained By**: Development Team
