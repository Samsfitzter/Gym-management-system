import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Fingerprint,
  CreditCard,
  RefreshCw,
  LogOut,
  X,
  TrendingUp,
  Bell,
  Wallet
} from 'lucide-react';
import samsFitzterLogo from '../assets/sams_fitzter_logo.jpg';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { isOpen, setIsOpen } = useSidebar();

  const navigation = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Members', to: '/members', icon: Users },
    { name: 'Personal Training', to: '/PT', icon: Dumbbell },
    { name: 'Attendance', to: '/attendance', icon: Fingerprint },
    { name: 'Payments', to: '/payments', icon: CreditCard },
    { name: 'Renewals', to: '/renewals', icon: RefreshCw },
    { name: 'Expenses', to: '/expenses', icon: Wallet },
    { name: 'Notifications', to: '/notifications', icon: Bell },
  ];

  if (user && user.role === 'admin') {
    navigation.push({ name: 'Reports', to: '/reports', icon: TrendingUp });
  }

  const handleLinkClick = () => {
    // Auto-close sidebar on link click on mobile
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`w-64 glass-panel border-r border-slate-800/80 flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-350 ease-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        {/* Brand logo */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={samsFitzterLogo}
              alt="Sam's Fitzter Logo"
              className="w-10 h-10 object-cover rounded-xl border border-amber-500/20 shadow-md shadow-amber-500/5 shrink-0"
            />
            <div className="overflow-hidden">
              <h1 className="text-base font-extrabold tracking-tight text-white truncate leading-tight">Sam's Fitzter</h1>
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest block truncate">Lifestyle & Fitness</p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white bg-slate-900/40 border border-slate-800 rounded-xl cursor-pointer"
            title="Close Menu"
          >
            <X size={15} />
          </button>
        </div>


        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.to}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                    ? 'gradient-btn text-white shadow-lg shadow-amber-600/15'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent hover:border-slate-700/30'
                  }`
                }
              >
                <Icon size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3 px-2 py-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-semibold text-slate-200 truncate">{user?.name}</h4>
              <p className="text-xs text-slate-500 font-medium capitalize">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 rounded-xl transition-all duration-200"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
