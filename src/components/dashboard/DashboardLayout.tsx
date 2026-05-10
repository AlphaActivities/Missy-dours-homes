import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Users, Menu, X, LayoutDashboard } from 'lucide-react';

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Clean up any overflow-hidden the public site may have left on body
  useEffect(() => {
    document.body.classList.remove('overflow-hidden');
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/dashboard/login', { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30 w-64 bg-neutral-900 border-r border-neutral-800
          flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-neutral-500 mb-0.5">Dashboard</p>
            <p className="text-sm font-semibold text-neutral-100 tracking-tight">Missy Dours</p>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden text-neutral-500 hover:text-neutral-200 transition-colors p-1"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <NavLink
            to="/dashboard"
            end
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`
            }
          >
            <LayoutDashboard size={16} />
            Overview
          </NavLink>
          <NavLink
            to="/dashboard/leads"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`
            }
          >
            <Users size={16} />
            Leads
          </NavLink>
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-neutral-800">
          <div className="px-3 py-2 mb-1">
            <p className="text-[11px] text-neutral-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-neutral-800 bg-neutral-900">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-400 hover:text-neutral-200 transition-colors p-1"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <p className="text-sm font-semibold tracking-tight">Missy Dours</p>
          <div className="w-8" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
