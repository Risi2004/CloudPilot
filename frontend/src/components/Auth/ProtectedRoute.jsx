import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, requireAdmin = false }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  if (!token) {
    // Redirect to login page if session token is missing
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && role !== 'admin') {
    // Redirect standard users away from admin views
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
