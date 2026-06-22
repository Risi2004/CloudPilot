import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import Dashboard from './pages/Dashboard/Dashboard';
import RepositoryAnalysis from './pages/RepositoryAnalysis/RepositoryAnalysis';
import RepositoryAnalysisDetails from './pages/RepositoryAnalysis/RepositoryAnalysisDetails';
import ArchitectureRecommendation from './pages/ArchitectureRecommendation/ArchitectureRecommendation';
import CostEstimation from './pages/CostEstimation/CostEstimation';
import WorkspaceEditor from './pages/WorkspaceEditor/WorkspaceEditor';

import ViewProfile from './pages/ViewProfile/ViewProfile';
import SupportUser from './pages/Support/SupportUser';
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
        <Route path="/cost-estimation" element={<ProtectedRoute><CostEstimation /></ProtectedRoute>} />
        <Route path="/workspace-editor" element={<ProtectedRoute><WorkspaceEditor /></ProtectedRoute>} />

        <Route path="/view-profile" element={<ProtectedRoute><ViewProfile /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportUser /></ProtectedRoute>} />
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
