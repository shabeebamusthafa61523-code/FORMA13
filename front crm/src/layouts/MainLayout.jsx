import React from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useLocation } from 'react-router-dom';
import DailyReportReminderModal from '../components/DailyReportReminderModal';
import TaskDueReminderModal from '../components/TaskDueReminderModal';
import { useUser } from '../contexts/UserContext';

const MainLayout = ({ children }) => {
  const location = useLocation();
  const { refetchUser } = useUser();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved !== null ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  // --- Inactivity session timeout tracker (30 minutes) ---
  React.useEffect(() => {
    let timeoutId;
    const timeoutDuration = 30 * 60 * 1000;

    const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_id');
      window.location.href = '/login?timeout=true';
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, timeoutDuration);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  React.useEffect(() => {
    if (refetchUser) refetchUser();
  }, [location.pathname, refetchUser]);

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-100">
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        setIsCollapsed={setSidebarCollapsed} 
        isMobileOpen={mobileSidebarOpen} 
        setIsMobileOpen={setMobileSidebarOpen} 
      />

      <Navbar 
        isSidebarCollapsed={sidebarCollapsed} 
        toggleMobileSidebar={() => setMobileSidebarOpen(prev => !prev)} 
      />

      <main className={`pt-20 pb-8 px-6 w-full min-h-screen transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-70'}`}>
        {children}
      </main>

      <DailyReportReminderModal />
      <TaskDueReminderModal />
    </div>
  );
};

export default MainLayout;
