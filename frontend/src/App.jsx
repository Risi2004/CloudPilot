import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import Dashboard from './pages/Dashboard/Dashboard';
import RepositoryAnalysis from './pages/RepositoryAnalysis/RepositoryAnalysis';
import RepositoryAnalysisDetails from './pages/RepositoryAnalysis/RepositoryAnalysisDetails';
import ArchitectureRecommendation from './pages/ArchitectureRecommendation/ArchitectureRecommendation';
import Deployment from './pages/Deployment/Deployment';
import PlatformSelection from './pages/PlatformSelection/PlatformSelection';
import CostEstimation from './pages/CostEstimation/CostEstimation';
import WorkspaceEditor from './pages/WorkspaceEditor/WorkspaceEditor';

import ViewProfile from './pages/ViewProfile/ViewProfile';
import SupportUser from './pages/Support/SupportUser';
import Upgrade from './pages/Upgrade/Upgrade';
import AdminDashboard from './pages/Admin/AdminDashboard/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement/UserManagement';
import SubscriptionManagement from './pages/Admin/SubscriptionManagement/SubscriptionManagement';
import Revenue from './pages/Admin/Revenue/Revenue';
import AIAgents from './pages/Admin/AIAgents/AIAgents';
import KnowledgeBase from './pages/Admin/KnowledgeBase/KnowledgeBase';
import Support from './pages/Admin/Support/Support';
import Notification from './pages/Admin/Notification/Notification';
import AuditLogs from './pages/Admin/AuditLogs/AuditLogs';
import Settings from './pages/Admin/Settings/Settings';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import './App.css';

function App() {
  useEffect(() => {
    let active = false;
    
    const handleActivity = () => {
      active = true;
    };

    // Listen for any interactions indicating that the user is actively using the website
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('scroll', handleActivity);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const interval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      if (active) {
        active = false; // Reset the activity flag
        try {
          await fetch(`${API_URL}/api/auth/activity`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (err) {
          console.error('Failed to report activity:', err);
        }
      }
    }, 60 * 1000); // Check and ping every 60 seconds

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearInterval(interval);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/repositories" element={<ProtectedRoute><RepositoryAnalysis /></ProtectedRoute>} />
        <Route path="/repository-analysis" element={<ProtectedRoute><RepositoryAnalysisDetails /></ProtectedRoute>} />
        <Route path="/repositoy-analysis" element={<ProtectedRoute><RepositoryAnalysisDetails /></ProtectedRoute>} />
        <Route path="/architecture-recommendation" element={<ProtectedRoute><ArchitectureRecommendation /></ProtectedRoute>} />
        <Route path="/deployment" element={<ProtectedRoute><Deployment /></ProtectedRoute>} />
        <Route path="/platform-selection" element={<ProtectedRoute><PlatformSelection /></ProtectedRoute>} />
        <Route path="/cost-estimation" element={<ProtectedRoute><CostEstimation /></ProtectedRoute>} />
        <Route path="/workspace-editor" element={<ProtectedRoute><WorkspaceEditor /></ProtectedRoute>} />

        <Route path="/view-profile" element={<ProtectedRoute><ViewProfile /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportUser /></ProtectedRoute>} />
        <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/dashbaord" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute requireAdmin={true}><UserManagement /></ProtectedRoute>} />
        <Route path="/admin/subscriptions" element={<ProtectedRoute requireAdmin={true}><SubscriptionManagement /></ProtectedRoute>} />
        <Route path="/admin/revenue" element={<ProtectedRoute requireAdmin={true}><Revenue /></ProtectedRoute>} />
        <Route path="/admin/ai-agents" element={<ProtectedRoute requireAdmin={true}><AIAgents /></ProtectedRoute>} />
        <Route path="/admin/knowledge-base" element={<ProtectedRoute requireAdmin={true}><KnowledgeBase /></ProtectedRoute>} />
        <Route path="/admin/support" element={<ProtectedRoute requireAdmin={true}><Support /></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute requireAdmin={true}><Notification /></ProtectedRoute>} />
        <Route path="/admin/audit-logs" element={<ProtectedRoute requireAdmin={true}><AuditLogs /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute requireAdmin={true}><Settings /></ProtectedRoute>} />
        <Route path="*" element={<UnmatchedRouteFallback />} />
      </Routes>
    </BrowserRouter>
  );
}

function UnmatchedRouteFallback() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(-1);
  }, [navigate]);
  return null;
}

export default App;
