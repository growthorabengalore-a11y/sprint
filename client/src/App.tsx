import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { ToastHost } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/admin/Dashboard';
import Employees from './pages/admin/Employees';
import SprintReports from './pages/admin/SprintReports';
import PerformanceReports from './pages/admin/PerformanceReports';
import AttendanceDashboard from './pages/admin/AttendanceDashboard';
import AttendanceReports from './pages/admin/AttendanceReports';
import Settings from './pages/admin/Settings';
import Home from './pages/employee/Home';
import Sprint from './pages/employee/Sprint';
import Attendance from './pages/employee/Attendance';
import Landing from './pages/Landing';

function Guard({ role, children }: { role: 'admin' | 'employee'; children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />;
  return children;
}
export default function App() {
  const { user, loading } = useAuth();
  return (
    <>
      <ToastHost />
      <Routes>
        <Route path="/login" element={user && !loading ? <Navigate to={user.mustChangePassword ? '/change-password' : user.role === 'admin' ? '/admin' : '/app'} replace /> : <Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/admin" element={<Guard role="admin"><Layout kind="admin" /></Guard>}>
          <Route index element={<Dashboard />} />
          <Route path="champs" element={<Employees />} />
          <Route path="sprint-reports" element={<SprintReports />} />
          <Route path="performance" element={<PerformanceReports />} />
          <Route path="attendance" element={<AttendanceDashboard />} />
          <Route path="attendance-reports" element={<AttendanceReports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/app" element={<Guard role="employee"><Layout kind="employee" /></Guard>}>
          <Route index element={<Home />} />
          <Route path="sprint" element={<Sprint />} />
          <Route path="attendance" element={<Attendance />} />
        </Route>
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </>
  );
}
