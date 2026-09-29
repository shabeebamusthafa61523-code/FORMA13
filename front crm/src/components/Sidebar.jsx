import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Wallet, 
  ShieldCheck,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';

const accountsSubItems = [
  { label: 'Capital', path: '/accounts/capital' },
  { label: 'Sales', path: '/accounts/sales' },
  { label: 'Income', path: '/accounts/income' },
  { label: 'Purchase', path: '/accounts/purchase' },
  { label: 'Expense Categories', path: '/accounts/categories' },
  { label: 'Expense', path: '/accounts/expenses' },
  { label: 'Wage', path: '/accounts/salary' },
  { label: 'Ledger', path: '/accounts/ledger' },
  { label: 'Day Book', path: '/accounts/cash-book' },
  { label: 'Profit and Loss', path: '/accounts/reports' }
];

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const activePath = location.pathname;

  const isAccountsActive = activePath.startsWith('/accounts');
  const [isAccountsOpen, setIsAccountsOpen] = useState(isAccountsActive);

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    if (isAccountsActive) {
      setIsAccountsOpen(true);
    }
  }, [isAccountsActive]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_id');
    window.location.href = '/login';
  };

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    try {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(nextState));
    } catch (e) {}
  };

  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-200 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo header with arrow toggle */}
        <div className="h-16 flex items-center justify-between px-5 shrink-0 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {!isCollapsed ? (
              <span className="text-xl font-black text-indigo-600 tracking-tight">StaffHQ</span>
            ) : (
              <span className="text-xl font-black text-indigo-600">S</span>
            )}
          </div>
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Employees */}
          <Link
            to="/users"
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base font-semibold transition-all ${
              activePath === '/users'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={isCollapsed ? 'Employees' : undefined}
          >
            <Users size={20} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Employees</span>}
          </Link>

          {/* Clients */}
          <Link
            to="/clients"
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base font-semibold transition-all ${
              activePath === '/clients'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={isCollapsed ? 'Clients' : undefined}
          >
            <Building2 size={20} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Clients</span>}
          </Link>

          {/* Accounts Dropdown Item */}
          <div>
            <button
              onClick={() => setIsAccountsOpen(!isAccountsOpen)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-semibold transition-all cursor-pointer ${
                isAccountsActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={isCollapsed ? 'Accounts' : undefined}
            >
              <div className="flex items-center gap-3.5">
                <Wallet size={20} className="shrink-0" />
                {!isCollapsed && <span className="truncate">Accounts</span>}
              </div>
              {!isCollapsed && (
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-200 ${isAccountsOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {/* Sub-items */}
            {isAccountsOpen && !isCollapsed && (
              <div className="mt-1.5 ml-4 pl-3 border-l-2 border-slate-200 space-y-1">
                {accountsSubItems.map((sub) => {
                  const isSubActive = activePath === sub.path;
                  return (
                    <Link
                      key={sub.path}
                      to={sub.path}
                      className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSubActive
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Permissions */}
          <Link
            to="/sidebar-permissions"
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base font-semibold transition-all ${
              activePath === '/sidebar-permissions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={isCollapsed ? 'Sidebar Permissions' : undefined}
          >
            <ShieldCheck size={20} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Sidebar Permissions</span>}
          </Link>
        </div>

        {/* Footer theme & logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-1">
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
          >
            {isDark ? (
              <>
                <Sun size={20} className="shrink-0 text-amber-400" />
                {!isCollapsed && <span>Light Mode</span>}
              </>
            ) : (
              <>
                <Moon size={20} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                {!isCollapsed && <span>Night Mode</span>}
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
          >
            <LogOut size={20} className="shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
        />
      )}

      {/* 3. Mobile Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 shrink-0">
          <span className="text-xl font-black text-indigo-600">StaffHQ</span>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Employees */}
          <Link
            to="/users"
            onClick={() => setIsMobileOpen(false)}
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base font-semibold transition-all ${
              activePath === '/users'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Users size={20} className="shrink-0" />
            <span>Employees</span>
          </Link>

          {/* Clients */}
          <Link
            to="/clients"
            onClick={() => setIsMobileOpen(false)}
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base font-semibold transition-all ${
              activePath === '/clients'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Building2 size={20} className="shrink-0" />
            <span>Clients</span>
          </Link>

          {/* Accounts Dropdown Item */}
          <div>
            <button
              onClick={() => setIsAccountsOpen(!isAccountsOpen)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-semibold transition-all ${
                isAccountsActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Wallet size={20} className="shrink-0" />
                <span>Accounts</span>
              </div>
              <ChevronDown
                size={18}
                className={`transition-transform duration-200 ${isAccountsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Sub-items */}
            {isAccountsOpen && (
              <div className="mt-1.5 ml-4 pl-3 border-l-2 border-slate-200 space-y-1">
                {accountsSubItems.map((sub) => {
                  const isSubActive = activePath === sub.path;
                  return (
                    <Link
                      key={sub.path}
                      to={sub.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSubActive
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Permissions */}
          <Link
            to="/sidebar-permissions"
            onClick={() => setIsMobileOpen(false)}
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base font-semibold transition-all ${
              activePath === '/sidebar-permissions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck size={20} className="shrink-0" />
            <span>Sidebar Permissions</span>
          </Link>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-1">
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            {isDark ? (
              <>
                <Sun size={20} className="shrink-0 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={20} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span>Night Mode</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
          >
            <LogOut size={20} className="shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;