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
import ClientsForm from './pages/admin/Clientsform';
import Clientdata from './pages/admin/Clientdata';
import Teamtarget from './pages/admin/Teamtarget';
import LeadsCRM from './pages/admin/LeadsCRM';
import LeadUpdates from './pages/employee/LeadUpdates';
import Home from './pages/employee/Home';
import Sprint from './pages/employee/Sprint';
import Attendance from './pages/employee/Attendance';
import Landing from './pages/Landing';
import ClientIntake from './pages/ClientIntake';
import RolesCreation from './pages/admin/RolesCreation';

function Guard({ role, children }: { role: 'admin' | 'employee'; children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  const isAdmin = ['admin', 'branchAdmin', 'hr', 'operations'].includes(user.role);
  if ((role === 'admin' && !isAdmin) || (role === 'employee' && user.role !== 'employee')) return <Navigate to={isAdmin ? '/admin' : '/app'} replace />;
  return children;
}
const pagePaths: Record<string, string> = {
  dashboard: '/admin', champs: '/admin/champs', 'sprint-reports': '/admin/sprint-reports', performance: '/admin/performance',
  attendance: '/admin/attendance', 'attendance-reports': '/admin/attendance-reports', clients: '/admin/clients',
  'client-data': '/admin/client-data', 'team-target': '/admin/team-target', leads: '/admin/leads', settings: '/admin/settings',
};
function AdminPageAccess({ page, children }: { page: string; children: JSX.Element }) {
  const { user } = useAuth();
  const allowed = user?.role === 'admin' || (user?.role === 'branchAdmin' && page !== 'roles')
    || (['hr', 'operations'].includes(user?.role) && user.pagePermissions?.includes(page));
  if (allowed) return children;
  const fallback = user?.pagePermissions?.map((permission: string) => pagePaths[permission]).find(Boolean);
  return fallback ? <Navigate to={fallback} replace /> : <div className="card p-6 text-sm text-slate-600">No admin pages are assigned to this account. Contact your administrator.</div>;
}
function AdminLanding() {
  const { user } = useAuth();
  if (['hr', 'operations'].includes(user?.role) && !user.pagePermissions?.includes('dashboard')) {
    const first = user.pagePermissions?.map((permission: string) => pagePaths[permission]).find(Boolean);
    return first ? <Navigate to={first} replace /> : <div className="card p-6 text-sm text-slate-600">No admin pages are assigned to this account. Contact your administrator.</div>;
  }
  return <Dashboard />;
}
export default function App() {
  const { user, loading } = useAuth();
  const isAdmin = ['admin', 'branchAdmin', 'hr', 'operations'].includes(user?.role || '');
  return (
    <>
      <ToastHost />
      <Routes>
        <Route path="/login" element={user && !loading ? <Navigate to={user.mustChangePassword ? '/change-password' : isAdmin ? '/admin' : '/app'} replace /> : <Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/client-intake/:token" element={<ClientIntake />} />
        <Route path="/admin" element={<Guard role="admin"><Layout kind="admin" /></Guard>}>
          <Route index element={<AdminLanding />} />
          <Route path="champs" element={<AdminPageAccess page="champs"><Employees /></AdminPageAccess>} />
          <Route path="sprint-reports" element={<AdminPageAccess page="sprint-reports"><SprintReports /></AdminPageAccess>} />
          <Route path="performance" element={<AdminPageAccess page="performance"><PerformanceReports /></AdminPageAccess>} />
          <Route path="attendance" element={<AdminPageAccess page="attendance"><AttendanceDashboard /></AdminPageAccess>} />
          <Route path="attendance-reports" element={<AdminPageAccess page="attendance-reports"><AttendanceReports /></AdminPageAccess>} />
          <Route path="settings" element={<AdminPageAccess page="settings"><Settings /></AdminPageAccess>} />
          <Route path="clients" element={<AdminPageAccess page="clients"><ClientsForm /></AdminPageAccess>} />
          <Route path="client-data" element={<AdminPageAccess page="client-data"><Clientdata /></AdminPageAccess>} />
          <Route path="team-target" element={<AdminPageAccess page="team-target"><Teamtarget /></AdminPageAccess>} />
          <Route path="leads" element={<AdminPageAccess page="leads"><LeadsCRM /></AdminPageAccess>} />
          <Route path="roles" element={<AdminPageAccess page="roles"><RolesCreation /></AdminPageAccess>} />
        </Route>
        <Route path="/app" element={<Guard role="employee"><Layout kind="employee" /></Guard>}>
          <Route index element={<Home />} />
          <Route path="sprint" element={<Sprint />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="lead-updates" element={<LeadUpdates />} />
        </Route>
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </>
  );
}
