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
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/repositories" element={<RepositoryAnalysis />} />
        <Route path="/repository-analysis" element={<RepositoryAnalysisDetails />} />
        <Route path="/repositoy-analysis" element={<RepositoryAnalysisDetails />} />
        <Route path="/architecture-recommendation" element={<ArchitectureRecommendation />} />
        <Route path="/cost-estimation" element={<CostEstimation />} />
        <Route path="/workspace-editor" element={<WorkspaceEditor />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/deployment-plan" element={<DeploymentPlan />} />
        <Route path="/ai-assistant" element={<AiAssistant />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
