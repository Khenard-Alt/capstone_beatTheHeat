# Frontend Mock Data Audit - Beat The Heat

> **Generated:** 2026-03-25  
> **Status:** 5 files with hardcoded data identified

---

## 📊 Summary

| File | Type | Data | Priority | Action |
|------|------|------|----------|--------|
| ✅ Dashboard.tsx | Chart | Weather trend | FIXED | Use real readings |
| 🔴 HealthAdvisory.tsx | Advisory list | Mock advisories | HIGH | Fetch from backend |
| 🔴 HeatIndex.tsx | Chart | Daily/Weekly/Monthly | HIGH | Use real historical |
| 🔴 AdminDashboard.tsx | Stats | System metrics | MEDIUM | Compute from data |
| 🔴 ParentDashboard.tsx | Chart | Weather data | MEDIUM | Use live API |

---

## 📝 Detailed Findings

### 1. ✅ Dashboard.tsx - FIXED
- **Lines:** 112-119 (chart data)
- **Change:** Replaced hardcoded data with `weatherHistory`
- **Status:** ✅ COMPLETE - now shows real data every 15 min

### 2. 🔴 HealthAdvisory.tsx - NEEDS FIX
- **Lines:** 15-40 (mock advisory list)
- **Current:** 3 hardcoded advisories with fake timestamps
- **Should be:** Fetch from backend `ai_analysis_logs` table
- **Backend available:** GET `/api/health-advisories` (needs to be created)

### 3. 🔴 HeatIndex.tsx - NEEDS FIX
- **Lines:** 12-35 (dailyData, weeklyData, monthlyData)
- **Current:** Hardcoded sample readings
- **Should be:** Fetch from backend database:
  - Daily: Last 24 hours of `heat_index_logs` + `weather_data`
  - Weekly: Last 7 days average
  - Monthly: Last 30 days average

### 4. 🔴 AdminDashboard.tsx - NEEDS FIX
- **Lines:** 59-77 (system stats, advisory trend, incident summary)
- **Current:** Hardcoded metrics (128 users, 3 advisories, etc.)
- **Should be:** Count from backend database:
  - `ai_analysis_logs` count (for advisories)
  - Incident data from health records
  - Active user count from sessions

### 5. 🔴 ParentDashboard.tsx - NEEDS FIX
- **Lines:** 55-62 (chart data) + 13-50 (currentWeather)
- **Current:** Mock weather + hardcoded daily chart
- **Should be:** Fetch from backend `/api/weather/current` (like Dashboard)

### 6. 🟡 Header.tsx - LOW PRIORITY
- **Lines:** 25-35 (mock notifications)
- **Current:** 3 hardcoded notifications
- **Should be:** Real notifications (optional for MVP)

### 7. 🟡 Login.tsx - LOW PRIORITY
- **Lines:** 29-41 (mock chat messages)
- **Current:** Initial chatbot response
- **Status:** Already tries real API first, falls back gracefully ✅

---

## 🎯 Recommended Actions (Priority Order)

### Phase 1: Add Backend Endpoints (1-2 hours)
1. Create `GET /api/health-advisories` endpoint
   - Query `ai_analysis_logs` table
   - Return latest advisories
2. Create `GET /api/heat-index/history?period=daily|weekly|monthly` endpoint
   - Calculate aggregates from `heat_index_logs`
3. Create `GET /api/admin/stats` endpoint
   - Return counts from database

### Phase 2: Update Frontend (1-2 hours)
1. HealthAdvisory.tsx - Use `fetchHealthAdvisories()`
2. HeatIndex.tsx - Use `fetchHeatIndexHistory(period)`
3. AdminDashboard.tsx - Use `fetchAdminStats()`
4. ParentDashboard.tsx - Use real weather + history

### Phase 3: Polish (optional)
1. Header notifications - real or keep mock
2. Remove all `// Mock` comments

---

## 📋 Implementation Checklist

- [ ] Created backend advisories endpoint
- [ ] Created backend heat-index history endpoint  
- [ ] Created backend admin stats endpoint
- [ ] Updated HealthAdvisory.tsx to fetch real data
- [ ] Updated HeatIndex.tsx with real history
- [ ] Updated AdminDashboard.tsx with real stats
- [ ] Updated ParentDashboard.tsx with real weather
- [ ] Tested all 5 pages with real backend data
- [ ] Removed `Mock` comments from frontend

---

## 🚀 Quick Reference: What's Already Real

✅ **Dashboard.tsx** - Weather trends (FIXED)  
✅ **Login.tsx** - Chatbot tries real API first (GOOD)  
✅ **Backend** - All APIs return real data (READY)

---

**Next Step:** Create backend endpoints for advisories, history, and admin stats!
