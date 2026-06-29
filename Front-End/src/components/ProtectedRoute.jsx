import { Navigate } from 'react-router-dom';
import { getCurrentUser, getToken } from '../lib/api';

// ProtectedRoute mendukung:
// - login required
// - role check optional
export default function ProtectedRoute({ children, allowRoles = [] }) {
  const token = getToken();
  const user = getCurrentUser();

  if (!token || !user) return <Navigate to="/login" replace />;

  if (allowRoles.length > 0 && !allowRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}