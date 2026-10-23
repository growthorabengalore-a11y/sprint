import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiGrid, FiUsers, FiFileText, FiTrendingUp, FiClock, FiCalendar, FiSettings, FiLogOut, FiMenu, FiX, FiHome, FiEdit3, FiCamera, FiBriefcase, FiSearch } from 'react-icons/fi';
import { useAuth } from '../auth';

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: FiGrid, end: true }, { to: '/admin/champs', label: 'Bangalore Champs', icon: FiUsers },
  { to: '/admin/sprint-reports', label: 'Sprint Reports', icon: FiFileText }, { to: '/admin/performance', label: 'Performance Reports', icon: FiTrendingUp },
  { to: '/admin/clients', label: 'Clients', icon: FiBriefcase }, { to: '/admin/client-data', label: 'Client Data', icon: FiSearch },
  { to: '/admin/attendance', label: 'Attendance Dashboard', icon: FiClock }, { to: '/admin/attendance-reports', label: 'Attendance Reports', icon: FiCalendar },
  { to: '/admin/settings', label: 'Settings', icon: FiSettings },
];
const empNav = [{ to: '/app', label: 'Home', icon: FiHome, end: true }, { to: '/app/attendance', label: 'Take Attendance', icon: FiCamera }, { to: '/app/sprint', label: 'Update Sprint', icon: FiEdit3 }];

export default function Layout({ kind }: { kind: 'admin' | 'employee' }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth(); const nav = useNavigate();
  const items = kind === 'admin' ? adminNav : empNav;
  const side = (
    <nav className="flex h-full flex-col bg-white border-r border-crimson-200/70">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="h-12 w-12 shrink-0 border border-crimson-200/70 bg-white p-1">
          <img src="/assets/images/logo.jpeg" alt="Growthora logo" className="h-full w-full object-contain" />
        </div>
        <div><div className="text-xl font-extrabold text-crimson-700">Growthora</div><div className="text-xs text-slate-500">Sprint &amp; Attendance</div></div>
      </div>
      <div className="flex-1 space-y-1 px-3">
        {items.map((i) => <NavLink key={i.to} to={i.to} end={(i as any).end} onClick={() => setOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold ${isActive ? 'bg-crimson-600 text-white' : 'text-ink hover:bg-crimson-50'}`}><i.icon size={18} />{i.label}</NavLink>)}
      </div>
      <button className="m-3 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={async () => { await logout(); nav('/login'); }}><FiLogOut size={18} /> Logout</button>
    </nav>
  );
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:block md:w-64 md:shrink-0 md:sticky md:top-0 md:h-screen">{side}</aside>
      {open && <div className="fixed inset-0 z-40 md:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} /><div className="absolute left-0 top-0 h-full w-72 max-w-[85vw]">{side}</div></div>}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-crimson-200/70 bg-white/90 px-4 py-3 backdrop-blur">
          <button className="md:hidden p-2" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <FiX size={22} /> : <FiMenu size={22} />}</button>
          <div className="flex-1 text-sm text-slate-500">{kind === 'admin' ? 'Admin Panel' : 'Employee Panel'}</div>
          <div className="text-right text-sm"><div className="font-semibold">{user?.name}</div><div className="text-xs text-slate-500">{user?.employeeId}</div></div>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
