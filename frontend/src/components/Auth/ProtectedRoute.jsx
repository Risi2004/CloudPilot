import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    // Redirect to login page if session token is missing
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
