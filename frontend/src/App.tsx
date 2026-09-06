import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { Sidebar } from './components/sidebar/Sidebar';
import { Footer } from './components/Footer';
import { Loading } from './components/Loading';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/adminDash/AdminDashboard';
import { ParentDashboard } from './pages/parentDash/ParentDashboard';
import { Login } from './pages/Login';
import { HeatIndex } from './pages/HeatIndex';
import { HealthAdvisory } from './pages/HealthAdvisory';
import { Notifications } from './pages/Notifications';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { SchoolManagement } from './pages/SchoolManagement';
import { ParentQuestionsConcerns } from './pages/parentDash/ParentQuestionsConcerns';
import { ParentAnnouncements } from './pages/parentDash/ParentAnnouncements';
import { ParentChatbot } from './pages/parentDash/ParentChatbot';
import { SmartAdvisoryBot } from './components/SmartAdvisoryBot';

import { ParentProfileSettings } from './pages/parentDash/ParentProfileSettings';
import { PrincipalDashboard } from './pages/principalDash/PrincipalDashboard';
import PrincipalReports from './pages/principalDash/PrincipalReports';
import AnnouncementShell from './pages/principalDash/AnnouncementShell';
import PrincipalAdvisories from './pages/principalDash/PrincipalAdvisories';
import HeadTeacherPrincipalAnnouncements from './pages/headTeacherDash/HeadTeacherPrincipalAnnouncements';
import PrincipalChatbot from './pages/principalDash/PrincipalChatbot';
import PrincipalProfileSettings from './pages/principalDash/PrincipalProfileSettings';
import { HeadTeacherDashboard } from './pages/headTeacherDash/HeadTeacherDashboard';
import IncidentReview from './pages/headTeacherDash/IncidentReview';
import IncidentReports from './pages/headTeacherDash/IncidentReports';
import Chatbot from './pages/headTeacherDash/Chatbot';
import ProfileSettings from './pages/headTeacherDash/ProfileSettings';
import { TeacherDashboard } from './pages/teacherDash/TeacherDashboard';
import TeacherConductForm from './pages/teacherDash/ConductForm';
import TeacherIncidentReports from './pages/teacherDash/IncidentReports';
import TeacherAdvisories from './pages/teacherDash/Advisories';
import TeacherMessages from './pages/teacherDash/Messages';
import TeacherChatbot from './pages/teacherDash/Chatbot';
import TeacherProfileSettings from './pages/teacherDash/ProfileSettings';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <Loading fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const ParentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <Loading fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'parent') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const PrincipalRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <Loading fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'principal') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const HeadTeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <Loading fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'head-teacher') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const TeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <Loading fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'teacher') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const HomeRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Loading fullScreen text="Loading..." />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (user?.role === 'principal') {
    return <Navigate to="/principal/dashboard" replace />;
  }

  if (user?.role === 'head-teacher') {
    return <Navigate to="/head-teacher/dashboard" replace />;
  }

  if (user?.role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  if (user?.role === 'parent') {
    return <Navigate to="/parent/dashboard" replace />;
  }

  return <Dashboard />;
};

  const LandingRoute: React.FC = () => <Navigate to="/login" replace />;

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <Header user={user} />

      <div className="app-container">
        <Sidebar
          isOpen={true}
          userRole={user?.role}
          onLogout={logout}
        />

        <main className="app-main">
          <div className="app-content">{children}</div>
        </main>
      </div>

      
      <SmartAdvisoryBot />
      <Footer />
    </div>
  );
};

// PublicLayout was removed because it was not referenced in the routes.

const LoginLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="login-layout">
      <main className="login-main">
        <div className="login-content">{children}</div>
      </main>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginLayout><Login /></LoginLayout>} />
      <Route path="/register" element={<Navigate to="/login" replace />} />

      <Route path="/" element={<LandingRoute />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <HomeRoute />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/parent/dashboard"
        element={
          <ParentRoute>
            <AppLayout>
              <ParentDashboard />
            </AppLayout>
          </ParentRoute>
        }
      />

      <Route
        path="/parent/questions-concerns"
        element={
          <ParentRoute>
            <AppLayout>
              <ParentQuestionsConcerns />
            </AppLayout>
          </ParentRoute>
        }
      />

      <Route
        path="/parent/announcements"
        element={
          <ParentRoute>
            <AppLayout>
              <ParentAnnouncements />
            </AppLayout>
          </ParentRoute>
        }
      />

      <Route
        path="/parent/chatbot"
        element={
          <ParentRoute>
            <AppLayout>
              <ParentChatbot />
            </AppLayout>
          </ParentRoute>
        }
      />

      <Route
        path="/parent/profile-settings"
        element={
          <ParentRoute>
            <AppLayout>
              <ParentProfileSettings />
            </AppLayout>
          </ParentRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminDashboard />
            </AppLayout>
          </AdminRoute>
        }
      />

      <Route
        path="/principal/dashboard"
        element={
          <PrincipalRoute>
            <AppLayout>
              <PrincipalDashboard />
            </AppLayout>
          </PrincipalRoute>
        }
      />

      <Route
        path="/principal/reports"
        element={
          <PrincipalRoute>
            <AppLayout>
              <PrincipalReports />
            </AppLayout>
          </PrincipalRoute>
        }
      />

      <Route
        path="/principal/announcements"
        element={
          <PrincipalRoute>
            <AppLayout>
              <AnnouncementShell />
            </AppLayout>
          </PrincipalRoute>
        }
      />

      <Route
        path="/principal/announcements/heat-data"
        element={
          <PrincipalRoute>
            <AppLayout>
              <AnnouncementShell />
            </AppLayout>
          </PrincipalRoute>
        }
      />

      <Route
        path="/principal/announcements/advisories"
        element={
          <PrincipalRoute>
            <AppLayout>
              <AnnouncementShell />
            </AppLayout>
          </PrincipalRoute>
        }
      />

      <Route
        path="/principal/advisories"
        element={
          <PrincipalRoute>
            <AppLayout>
              <PrincipalAdvisories />
            </AppLayout>
          </PrincipalRoute>
        }
      />

      <Route
        path="/principal/chatbot"
        element={
          <PrincipalRoute>
            <AppLayout>
              <PrincipalChatbot />
            </AppLayout>
          </PrincipalRoute>
        }
      />

      <Route
        path="/principal/profile-settings"
        element={
          <PrincipalRoute>
            <AppLayout>
              <PrincipalProfileSettings />
            </AppLayout>
          </PrincipalRoute>
        }
      />

      <Route
        path="/head-teacher/dashboard"
        element={
          <HeadTeacherRoute>
            <AppLayout>
              <HeadTeacherDashboard />
            </AppLayout>
          </HeadTeacherRoute>
        }
      />

      <Route
        path="/head-teacher/announcements/principal"
        element={
          <HeadTeacherRoute>
            <AppLayout>
              <HeadTeacherPrincipalAnnouncements />
            </AppLayout>
          </HeadTeacherRoute>
        }
      />


      <Route
        path="/head-teacher/incident-review"
        element={
          <HeadTeacherRoute>
            <AppLayout>
              <IncidentReview />
            </AppLayout>
          </HeadTeacherRoute>
        }
      />

      <Route
        path="/head-teacher/incident-reports"
        element={
          <HeadTeacherRoute>
            <AppLayout>
              <IncidentReports />
            </AppLayout>
          </HeadTeacherRoute>
        }
      />

      <Route
        path="/head-teacher/advisories"
        element={
          <HeadTeacherRoute>
            <AppLayout>
              <PrincipalAdvisories />
            </AppLayout>
          </HeadTeacherRoute>
        }
      />

      <Route
        path="/head-teacher/chatbot"
        element={
          <HeadTeacherRoute>
            <AppLayout>
              <Chatbot />
            </AppLayout>
          </HeadTeacherRoute>
        }
      />

      <Route
        path="/head-teacher/profile-settings"
        element={
          <HeadTeacherRoute>
            <AppLayout>
              <ProfileSettings />
            </AppLayout>
          </HeadTeacherRoute>
        }
      />

      <Route
        path="/teacher/dashboard"
        element={
          <TeacherRoute>
            <AppLayout>
              <TeacherDashboard />
            </AppLayout>
          </TeacherRoute>
        }
      />

      <Route
        path="/teacher/conduct-form"
        element={
          <TeacherRoute>
            <AppLayout>
              <TeacherConductForm />
            </AppLayout>
          </TeacherRoute>
        }
      />

      <Route
        path="/teacher/incident-reports"
        element={
          <TeacherRoute>
            <AppLayout>
              <TeacherIncidentReports />
            </AppLayout>
          </TeacherRoute>
        }
      />

      <Route
        path="/teacher/advisories"
        element={
          <TeacherRoute>
            <AppLayout>
              <TeacherAdvisories />
            </AppLayout>
          </TeacherRoute>
        }
      />

      <Route
        path="/teacher/messages"
        element={
          <TeacherRoute>
            <AppLayout>
              <TeacherMessages />
            </AppLayout>
          </TeacherRoute>
        }
      />

      <Route
        path="/teacher/chatbot"
        element={
          <TeacherRoute>
            <AppLayout>
              <TeacherChatbot />
            </AppLayout>
          </TeacherRoute>
        }
      />

      <Route
        path="/teacher/profile-settings"
        element={
          <TeacherRoute>
            <AppLayout>
              <TeacherProfileSettings />
            </AppLayout>
          </TeacherRoute>
        }
      />

      <Route
        path="/heat-index"
        element={
          <ProtectedRoute>
            <AppLayout>
              <HeatIndex />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/health-advisory"
        element={
          <ProtectedRoute>
            <AppLayout>
              <HealthAdvisory />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Notifications />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/schools"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SchoolManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
