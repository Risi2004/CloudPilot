import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import Dashboard from './pages/Dashboard/Dashboard';
import RepositoryAnalysis from './pages/RepositoryAnalysis/RepositoryAnalysis';
import RepositoryAnalysisDetails from './pages/RepositoryAnalysis/RepositoryAnalysisDetails';
import ArchitectureRecommendation from './pages/ArchitectureRecommendation/ArchitectureRecommendation';
import CostEstimation from './pages/CostEstimation/CostEstimation';
import WorkspaceEditor from './pages/WorkspaceEditor/WorkspaceEditor';
import Recommendations from './pages/Recommendations/Recommendations';
import DeploymentPlan from './pages/DeploymentPlan/DeploymentPlan';
import AiAssistant from './pages/AiAssistant/AiAssistant';
import ViewProfile from './pages/ViewProfile/ViewProfile';
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
        <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
        <Route path="/deployment-plan" element={<ProtectedRoute><DeploymentPlan /></ProtectedRoute>} />
        <Route path="/ai-assistant" element={<ProtectedRoute><AiAssistant /></ProtectedRoute>} />
        <Route path="/view-profile" element={<ProtectedRoute><ViewProfile /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
