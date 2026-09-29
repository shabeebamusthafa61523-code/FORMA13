import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Bell, User, LogOut, Sun, Moon, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import ProfileDrawer from './ProfileDrawer';
import NotificationPopover from './NotificationPopover';
import NavbarNotificationPopup from './NavbarNotificationPopup';
import { AiAnalyzeButton, AiAnalyzeModal } from './AiAnalyzeModal';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const Navbar = ({ isSidebarCollapsed, toggleMobileSidebar }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPageAiOpen, setIsPageAiOpen] = useState(false);
  const [pageContextData, setPageContextData] = useState(null);

  // Pop-up modal state
  const [seenPopupIds, setSeenPopupIds] = useState(new Set());
  const [activePopupNotification, setActivePopupNotification] = useState(null);
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0);

  const location = useLocation();

  const pathName = location.pathname.substring(1);
  const pageTitle = pathName
    ? pathName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Dashboard';
  
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

  // State for scroll visibility tracking (only show on back scrolling)
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 10) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      if (Math.abs(currentScrollY - lastScrollY) < 5) {
        return;
      }

      if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // State for the logged-in user
  const [currentUser, setCurrentUser] = useState({
    name: 'Guest',
    role: 'User'
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser({
          name: parsedUser.name || 'User',
          role: parsedUser.role?.name || 'Staff'
        });
      } catch (err) {
        console.error("Failed to parse user data", err);
      }
    }
  }, []);

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 
      'Content-Type': 'application/json',
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` 
    };
  }, []);

  // Fetch notifications for the current logged in user
  const fetchMyNotifications = useCallback(async () => {
    try {
      const rawToken = localStorage.getItem('token');
      if (!rawToken) return true;

      const res = await fetch(`${API_BASE}/v1/notifications/my-notifications`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return false;

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          setNotifications(data.data);
          setUnreadCount(data.unreadCount || data.data.filter(n => !n.isRead).length);
        }
      }
      return true;
    } catch (err) {
      console.error("Failed to fetch my notifications in Navbar:", err);
      return false;
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;
    let inFlight = false;
    let consecutiveFailures = 0;
    const BASE_INTERVAL_MS = 8000; // Poll every 8s for live notification modal pop-ups
    const MAX_BACKOFF_MS = 2 * 60 * 1000;

    const scheduleNext = (delay) => {
      if (cancelled) return;
      timeoutId = setTimeout(runCheck, delay);
    };

    const runCheck = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      const ok = await fetchMyNotifications();
      inFlight = false;

      if (ok) {
        consecutiveFailures = 0;
        scheduleNext(BASE_INTERVAL_MS);
        return;
      }

      consecutiveFailures += 1;
      scheduleNext(Math.min(BASE_INTERVAL_MS * 2 ** consecutiveFailures, MAX_BACKOFF_MS));
    };

    runCheck();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchMyNotifications]);

  // Handle auto-triggering live pop-up modal ONLY for the single latest unread notification
  const [dismissedPopupIds, setDismissedPopupIds] = useState(new Set());

  const latestUnreadNotification = useMemo(() => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return null;
    return unread.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  }, [notifications]);

  useEffect(() => {
    if (latestUnreadNotification) {
      const latestId = latestUnreadNotification._id || latestUnreadNotification.id;
      if (!dismissedPopupIds.has(latestId)) {
        setActivePopupNotification(latestUnreadNotification);
      } else {
        setActivePopupNotification(null);
      }
    } else {
      setActivePopupNotification(null);
    }
  }, [latestUnreadNotification, dismissedPopupIds]);

  const handleClosePopup = () => {
    if (activePopupNotification) {
      const activeId = activePopupNotification._id || activePopupNotification.id;
      setDismissedPopupIds(prev => new Set([...prev, activeId]));
    }
    setActivePopupNotification(null);
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/notifications/mark-all-read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  return (
    <>
      <header className={`fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } ${isSidebarCollapsed ? 'lg:left-20' : 'lg:left-64'} left-0`}>
        
        {/* Left Side: Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobileSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors lg:hidden cursor-pointer"
            title="Open Menu"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Right Section Container */}
        <section className="flex items-center gap-3 relative">
          {/* Night mode / Light mode toggle button */}
          <button
            type="button"
            onClick={() => setIsDark(prev => !prev)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all cursor-pointer shadow-xs"
            title={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
          >
            {isDark ? (
              <>
                <Sun size={16} className="text-amber-400" />
                <span className="text-xs font-bold hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold hidden sm:inline">Night Mode</span>
              </>
            )}
          </button>

          {/* Right Actions Card (Profile) */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl shadow-sm transition-colors relative">
            {/* Profile Trigger */}
            <div
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 p-1 group cursor-pointer"
              title={currentUser.name}
            >
              <div className="relative w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-200 group-hover:border-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 transition-all shadow-sm overflow-hidden">
                <User size={16} />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 pr-2">
                {currentUser.name}
              </span>
            </div>
          </div>
        </section>

      </header>

      {/* Live Navbar Floating Notification Pop-up Modal */}
      {activePopupNotification && (
        <NavbarNotificationPopup
          notification={activePopupNotification}
          onClose={handleClosePopup}
          onMarkAsRead={handleMarkAsRead}
        />
      )}

      {/* Profile Drawer */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={currentUser}
      />

      {/* Universal Page AI Analyze Modal */}
      <AiAnalyzeModal
        isOpen={isPageAiOpen}
        onClose={() => setIsPageAiOpen(false)}
        contextData={pageContextData}
        title={`AI Analysis: ${pageTitle}`}
      />
    </>
  );
};

export default Navbar;