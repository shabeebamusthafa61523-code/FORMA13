import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit3, Trash2, Eye, X, Mail, Phone,
  Briefcase, Folder, UserCheck, ShieldAlert, Image as ImageIcon,
  Loader2, User, ChevronRight, CheckCircle2, AlertTriangle, Shield, BarChart3,
  ShieldCheck, KeyRound, Lock, Calendar, DollarSign, MapPin
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';
import PerformanceTab from '../components/PerformanceTab';
import PerformanceDashboard from './PerformanceDashboard';
import ExcelExportButton from '../components/ExcelExportButton';

const RAW_API_BASE = import.meta.env.VITE_API_URL || '/api';
const API_BASE = (RAW_API_BASE.endsWith('/') ? RAW_API_BASE.slice(0, -1) : RAW_API_BASE).replace(/\/+$/, '');

const useLockBodyScroll = (isOpen = true) => {
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY || window.pageYOffset;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);
};
const ROLES = [
  { id: "0", name: "superadmin" },
  { id: "1", name: "hr" },
  { id: "2", name: "admin" },
  { id: "3", name: "employee" }
];

const ALL_SIDEBAR_ITEMS = [
  // --- OVERVIEW & GENERAL ---
  { label: 'Admin Dashboard', path: '/dashboard', category: 'Overview' },
  { label: 'Approvals', path: '/approvals', category: 'Overview' },
  { label: 'Leave Requests', path: '/leaves', category: 'Overview' },
  { label: 'Notifications', path: '/notifications', category: 'Overview' },

  // --- DASHBOARDS ---
  { label: 'MD Dashboard', path: '/md-dashboard', category: 'Dashboards' },
  { label: 'HR Dashboard', path: '/hr-dashboard', category: 'Dashboards' },
  { label: 'Lead Dashboard', path: '/lead-dashboard', category: 'Dashboards' },
  { label: 'Marketing Dashboard', path: '/marketing-dashboard', category: 'Dashboards' },
  { label: 'Dev Dashboard', path: '/developer-dashboard', category: 'Dashboards' },
  { label: 'GD Dashboard', path: '/graphic-designer-dashboard', category: 'Dashboards' },
  { label: 'Video Dashboard', path: '/videographer-dashboard', category: 'Dashboards' },
  { label: 'Counselor Dashboard', path: '/counselor-dashboard', category: 'Dashboards' },

  // --- PEOPLE & HR ---
  { label: 'Users', path: '/users', category: 'People & HR' },
  { label: 'Departments', path: '/departments', category: 'People & HR' },
  { label: 'Recruitment', path: '/recruitment', category: 'People & HR' },
  { label: 'Attendance', path: '/attendance', category: 'People & HR' },
  { label: 'Sidebar Permissions', path: '/sidebar-permissions', category: 'People & HR' },

  // --- SALES & CRM ---
  { label: 'Clients', path: '/clients', category: 'Sales & CRM' },
  { label: 'Client Leads', path: '/client-leads', category: 'Sales & CRM' },
  { label: 'Student Leads', path: '/leads-telecaller', category: 'Sales & CRM' },

  // --- MARKETING & WORK ---
  { label: 'Projects', path: '/projects', category: 'Marketing & Work' },
  { label: 'Task Assign', path: '/todo', category: 'Marketing & Work' },
  { label: 'Content Calendar', path: '/calendar-work', category: 'Marketing & Work' },

  // --- FINANCE & PAYROLL ---
  { label: 'Accounts', path: '/accounts', category: 'Finance & Payroll' },
  { label: 'Sales', path: '/accounts/income', category: 'Finance & Payroll' },
  { label: 'Income', path: '/accounts/sales', category: 'Finance & Payroll' },
  { label: 'Purchase', path: '/accounts/purchase', category: 'Finance & Payroll' },
  { label: 'Create Invoice', path: '/accounts/create-invoice', category: 'Finance & Payroll' },
  { label: 'Expense Categories', path: '/accounts/categories', category: 'Finance & Payroll' },
  { label: 'Expense', path: '/accounts/expenses', category: 'Finance & Payroll' },
  { label: 'Salary Payment', path: '/accounts/salary', category: 'Finance & Payroll' },
  { label: 'Cash & Bank', path: '/accounts/cash-book', category: 'Finance & Payroll' },
  { label: 'Operation', path: '/accounts/operation', category: 'Finance & Payroll' },
  { label: 'Financial Report', path: '/accounts/reports', category: 'Finance & Payroll' },
  { label: 'Payslips', path: '/payslips', category: 'Finance & Payroll' },
  { label: 'Personal Payslip', path: '/my-payslip', category: 'Finance & Payroll' },

  // --- ACADEMY & LMS ---
  { label: 'Course Management', path: '/academy/courses', category: 'Academy & LMS' },
  { label: 'Batches', path: '/academy/batches', category: 'Academy & LMS' },
  { label: 'Enrollment Tracking', path: '/academy/enrollments', category: 'Academy & LMS' },
  { label: 'Student Attendance', path: '/student-attendance', category: 'Academy & LMS' },
  { label: 'My LMS Learning', path: '/academy/learning', category: 'Academy & LMS' },

  // --- REPORTS & ANALYTICS ---
  { label: 'KPI Analytics', path: '/performance-dashboard', category: 'Reports' },
  { label: 'AI Reports', path: '/ai-report', category: 'Reports' },
  { label: 'Employee Reports', path: '/employee-reports', category: 'Reports' },
  { label: 'Daily Report', path: '/basic-report', category: 'Reports' },
  { label: 'Team Reports', path: '/team-reports', category: 'Reports' },
  { label: 'HR Shift Report', path: '/hr-report', category: 'Reports' },
  { label: 'Ops Shift Report', path: '/ops-report', category: 'Reports' },
  { label: 'Accountant Shift Report', path: '/accountant-report', category: 'Reports' },
  { label: 'Marketing Shift Report', path: '/marketing-report', category: 'Reports' },
  { label: 'Developer Report', path: '/developer-report', category: 'Reports' },
  { label: 'Graphic Designer Report', path: '/graphic-designer-report', category: 'Reports' },
  { label: 'Videographer Report', path: '/videographer-report', category: 'Reports' },
  { label: 'Academic Counselor Report', path: '/academic-counselor-report', category: 'Reports' },
  { label: 'HOD R&D Report', path: '/hod-rd-report', category: 'Reports' },
  { label: 'HOD Marketing Report', path: '/hod-marketing-report', category: 'Reports' }
];

const STATUS_META = {
  active: { label: 'Active', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400', dot: 'bg-emerald-500' },
  inactive: { label: 'Inactive', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400', dot: 'bg-amber-500' }
};

const PermissionModal = ({ isOpen, onClose, user, onSave, showToast, getAuthHeaders }) => {
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  useLockBodyScroll(isOpen);

  const loggedInUser = useMemo(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const isLoggedInSuperAdmin = useMemo(() => {
    if (!loggedInUser) return false;
    const role = String(loggedInUser.role_id || loggedInUser.roleId || loggedInUser.role || '').toLowerCase().trim();
    return Boolean(
      loggedInUser.isSuperAdmin === true ||
      loggedInUser.is_super_admin === true ||
      role === 'superadmin' ||
      role === 'super_admin' ||
      role === '0'
    );
  }, [loggedInUser]);

  // Restrict selectable options to ONLY the sidebar items the logged-in user has permission for
  const availableSidebarItems = useMemo(() => {
    if (isLoggedInSuperAdmin || !loggedInUser) {
      return ALL_SIDEBAR_ITEMS;
    }

    if (Array.isArray(loggedInUser.permissions) && loggedInUser.permissions.length > 0) {
      const allowedSet = new Set(loggedInUser.permissions.map(p => String(p).toLowerCase().trim()));

      const extraPathMappings = {
        'admin dashboard': '/dashboard',
        'md dashboard': '/md-dashboard',
        'accountant dashboard': '/accountant-dashboard',
        'income': '/accounts/income',
        'sales': '/accounts/sales',
        'capital': '/accounts/capital',
        'purchase': '/accounts/purchase',
        'create invoice': '/accounts/create-invoice',
      };

      const extraAllowedPaths = new Set();
      for (const perm of allowedSet) {
        if (extraPathMappings[perm]) {
          extraAllowedPaths.add(extraPathMappings[perm].toLowerCase());
        }
      }

      return ALL_SIDEBAR_ITEMS.filter(item => {
        const itemLabelLower = item.label ? item.label.toLowerCase().trim() : '';
        const itemPathLower = item.path ? item.path.toLowerCase().trim() : '';

        return (
          allowedSet.has(itemLabelLower) ||
          allowedSet.has(itemPathLower) ||
          extraAllowedPaths.has(itemPathLower)
        );
      });
    }

    return ALL_SIDEBAR_ITEMS;
  }, [loggedInUser, isLoggedInSuperAdmin]);

  useEffect(() => {
    if (user) {
      setSelectedPermissions(Array.isArray(user.permissions) && user.permissions.length > 0 ? user.permissions : ['Task Assign', 'Notifications', 'Attendance', 'Leave Requests']);
      setIsSuperAdmin(Boolean(user.isSuperAdmin || user.role === 'superadmin'));
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const togglePermission = (label) => {
    setSelectedPermissions(prev =>
      prev.includes(label) ? prev.filter(p => p !== label) : [...prev, label]
    );
  };

  const handleSelectAll = () => {
    const availableLabels = availableSidebarItems.map(i => i.label);
    setSelectedPermissions(prev => Array.from(new Set([...prev, ...availableLabels])));
  };

  const handleDeselectAll = () => {
    const availableSet = new Set(availableSidebarItems.map(i => i.label));
    setSelectedPermissions(prev => prev.filter(p => !availableSet.has(p)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userId = user.id || user._id;
      const res = await fetch(`${API_BASE}/v1/users/${userId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          permissions: selectedPermissions,
          isSuperAdmin,
          role: isSuperAdmin ? 'superadmin' : (user.role === 'superadmin' ? 'admin' : user.role)
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Sidebar permissions updated successfully!", "success");

        // If editing self, update localStorage.user and notify app
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUserId = currentUser._id || currentUser.id;
        if (String(currentUserId) === String(userId)) {
          const updatedLocalUser = {
            ...currentUser,
            permissions: selectedPermissions,
            isSuperAdmin,
            role: isSuperAdmin ? 'superadmin' : currentUser.role
          };
          localStorage.setItem('user', JSON.stringify(updatedLocalUser));
          window.dispatchEvent(new Event('storage'));
        }

        onSave();
        onClose();
      } else {
        showToast(data.message || "Failed to update permissions.", "error");
      }
    } catch (err) {
      console.error("Error saving permissions:", err);
      showToast("Error updating permissions.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Group items by category
  const categories = [...new Set(availableSidebarItems.map(i => i.category))];

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex justify-center items-center p-4 overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">{user.name}</h2>
              <p className="text-xs text-indigo-100 font-bold uppercase tracking-wider">Configure Sidebar Access & Permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Super Admin Access Toggle */}
        <div className="p-6 bg-indigo-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-indigo-500/20 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isSuperAdmin ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                <Shield size={20} />
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 block">Grant Super Admin Access</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Super Admins have unrestricted access to all pages, settings, and sidebar items across the platform.</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isSuperAdmin}
                disabled={!isLoggedInSuperAdmin}
                onChange={(e) => {
                  if (isLoggedInSuperAdmin) {
                    setIsSuperAdmin(e.target.checked);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        {/* Sidebar Menu Item Permissions List */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Individual Sidebar Page Access</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                disabled={isSuperAdmin}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-40 cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={handleDeselectAll}
                disabled={isSuperAdmin}
                className="text-[11px] font-bold text-slate-500 hover:underline disabled:opacity-40 cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 size={16} />
              <span>Super Admin mode enabled — All sidebar pages are automatically accessible to this user.</span>
            </div>
          )}

          {categories.map(cat => {
            const catItems = availableSidebarItems.filter(i => i.category === cat);
            return (
              <div key={cat} className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400">{cat}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {catItems.map(item => {
                    const isChecked = isSuperAdmin || selectedPermissions.includes(item.label);
                    return (
                      <label
                        key={item.label}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${isChecked
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500/30 text-indigo-900 dark:text-indigo-100 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          } ${isSuperAdmin ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        <span className="text-xs font-bold">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isSuperAdmin}
                          onChange={() => togglePermission(item.label)}
                          className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            <span>Save Permissions</span>
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, active, inactive
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const [permissionUser, setPermissionUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [imgErrors, setImgErrors] = useState({});

  const isHr = useMemo(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const userObj = JSON.parse(savedUser);
        const role = String(userObj.role_id || userObj.roleId || userObj.role || '').toLowerCase().trim();
        const designation = String(userObj.designation || '').toLowerCase().trim();
        const designationId = String(userObj.designationId?._id || userObj.designationId || userObj.designation_id || '').trim();
        return role === 'hr' || designation.includes('hr');
      }
    } catch (e) {
      console.error("Error checking HR role in Users:", e);
    }
    return false;
  }, []);

  const handlePermissionClick = (user) => {
    if (isHr) {
      showToast("HR users cannot manage permissions.", "warning");
      return;
    }
    const userId = user.id || user._id;
    navigate(`/permissions/${userId}`);
  };

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
  }, []);


  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/v1/users`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        setUsers([]);
        return;
      }
      const data = await res.json();

      let incomingUsers = [];
      if (data.success && Array.isArray(data.data)) {
        incomingUsers = data.data;
      } else if (Array.isArray(data)) {
        incomingUsers = data;
      }

      // Exclude superadmin users from staff directory listing
      const targetRolesOnly = incomingUsers.filter(user => {
        const userRoleId = String(user.roleId || user.role_id || user.role || '');
        const isSuper = user.isSuperAdmin === true || user.role === 'superadmin' || userRoleId === '0' || userRoleId.toLowerCase() === 'superadmin';
        return !isSuper;
      });

      setUsers(targetRolesOnly);
    } catch (e) {
      console.error("Failed to fetch users:", e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchDesignations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/designations`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        setDesignations([]);
        return;
      }
      const data = await res.json();
      setDesignations(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      console.error("Failed to fetch designations:", e);
      setDesignations([]);
    }
  }, [getAuthHeaders]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/departments?status=true`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        setDepartments([]);
        return;
      }
      const data = await res.json();
      setDepartments(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      console.error("Failed to fetch departments:", e);
      setDepartments([]);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchUsers();
    fetchDesignations();
    fetchDepartments();
  }, [fetchUsers, fetchDesignations, fetchDepartments]);

  const handleDesignationCreated = useCallback((designation) => {
    setDesignations(prev => {
      const exists = prev.some(item => String(item.id) === String(designation.id));
      return exists ? prev : [...prev, designation].sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  const handleDesignationUpdated = useCallback((designation) => {
    setDesignations(prev => prev.map(item => String(item.id) === String(designation.id) ? designation : item).sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const handleDesignationDeleted = useCallback((id) => {
    setDesignations(prev => prev.filter(item => String(item.id) !== String(id)));
  }, []);

  const designationMap = useMemo(() => {
    return new Map(designations.map(designation => [String(designation.id), designation.name]));
  }, [designations]);

  const getDesignationName = useCallback((user) => {
    const id = user.designationId || user.designation;
    return user.designationName || designationMap.get(String(id)) || user.designation || 'General Staff';
  }, [designationMap]);

  const departmentMap = useMemo(() => {
    return new Map(departments.map(department => [
      String(department.id || department._id),
      department.name
    ]));
  }, [departments]);

  const getDepartmentName = useCallback((user) => {
    const departmentId = user.departmentId?._id || user.departmentId || user.department;
    return user.departmentId?.name || departmentMap.get(String(departmentId)) || user.departmentName || user.department || 'Unassigned';
  }, [departmentMap]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: users.length,
      active: users.filter(u => (u.status || 'active') === 'active').length,
      inactive: users.filter(u => (u.status || 'active') === 'inactive').length
    };
  }, [users]);

  // Filtered & searched users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Tab filter
      if (activeTab !== 'all' && (user.status || 'active') !== activeTab) {
        return false;
      }
      // Search query filter
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.employeeId?.toLowerCase().includes(query) ||
        getDesignationName(user).toLowerCase().includes(query) ||
        getDepartmentName(user).toLowerCase().includes(query)
      );
    });
  }, [users, activeTab, searchQuery, getDesignationName, getDepartmentName]);

  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever filter changes
  React.useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleDeleteUser = (id, name) => {
    setDeleteUserConfirm({ isOpen: true, id, name });
  };

  const handleConfirmDeleteUser = async () => {
    const { id, name } = deleteUserConfirm;
    setDeleteUserConfirm({ isOpen: false, id: null, name: '' });
    try {
      const res = await fetch(`${API_BASE}/v1/users/delete/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok || data.success) {
        setUsers(prev => prev.filter(u => u.id !== id && u._id !== id));
        showToast('Employee records purged successfully.', 'success');
      } else {
        showToast(data.message || 'Deletion failed.', 'error');
      }
    } catch (e) {
      console.error("Deletion failed:", e);
      showToast('Network or server error during deletion.', 'error');
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  const handleViewClick = (user) => {
    setSelectedUser(user);
    setIsViewOpen(true);
  };

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto space-y-5">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
          <div>
            {/* <div className="flex items-center gap-3 mb-2">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Nexus Staff Portal</span>
            </div> */}
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 italic tracking-tighter leading-none">
              EMPLOYEE <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-lime-400">LIST</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ExcelExportButton
              data={filteredUsers.map(u => ({
                'Employee Name': u.name || '',
                'Email': u.email || '',
                'Phone': u.mobile || u.phone || '',
                'Role': u.role || '',
                'Designation': getDesignationName(u),
                'Department': getDepartmentName(u),
                'Status': u.status || 'active'
              }))}
              fileName="employees_list_export"
              sheetName="Employees"
            />
            <button
              onClick={() => setIsCreateOpen(true)}
              className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 dark:bg-slate-900 text-white dark:text-slate-100 border border-transparent dark:border-slate-800 shadow-lg hover:shadow-indigo-500/20 dark:hover:shadow-none rounded-full font-bold text-[12px] uppercase tracking-wider transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-indigo-700 dark:bg-lime-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Plus size={16} className="relative z-10" />
              <span className="relative z-10">Add Employee</span>
            </button>
          </div>
        </header>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-1">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {['all', 'active', 'inactive'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2 ${activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:bg-slate-800 dark:border-slate-700 dark:shadow-none'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 dark:text-slate-400'
                  }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative max-w-md w-full">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800/80 py-3.5 pl-4 pr-4 rounded-xl text-sm font-medium focus:border-indigo-500/50 dark:focus:border-indigo-400/50 outline-none transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Employees Table Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={40} />
            <p className="text-xs uppercase tracking-[0.2em] font-black text-slate-400 animate-pulse">Retrieving Core Intelligence</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center shadow-sm">
            <AlertTriangle className="mx-auto text-amber-500 mb-4 animate-bounce" size={40} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No Records Discovered</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">No employees matched your status tabs or query criteria. Modify filters or initiate a new employee onboarding pipeline.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80">
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Name</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Phone Number</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Role</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Position / Designation</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Status</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {pagedUsers.map((user) => {
                    const statusKey = user.status || (user.isActive ? 'active' : 'inactive');
                    const meta = STATUS_META[statusKey] || STATUS_META.active;
                    return (
                      <tr
                        key={user.id || user._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-200 group"
                      >
                        {/* Profile & Name */}
                        <td className="py-4 px-6 cursor-pointer" onClick={() => handleViewClick(user)}>
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {(user.avatar || user.profile_image || user.profileImage) && !imgErrors[user._id || user.id] ? (
                                <img
                                  src={user.avatar || user.profile_image || user.profileImage}
                                  alt={user.name}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-xs"
                                  onError={() => {
                                    setImgErrors(prev => ({ ...prev, [user._id || user.id]: true }));
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shadow-xs">
                                  {user.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
                                </div>
                              )}
                              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${meta.dot}`} />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {user.name}
                              </h4>
                            </div>
                          </div>
                        </td>

                        {/* Phone Number */}
                        <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300 font-medium">
                          {user.phone || '—'}
                        </td>

                        {/* Role */}
                        <td className="py-4 px-6 text-xs">
                          {user.isSuperAdmin || String(user.role).toLowerCase() === 'superadmin' || String(user.roleId || user.role_id) === '0' ? (
                            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                              <Shield size={10} /> Super Admin
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/20 px-2.5 py-1 rounded-md inline-block">
                              {ROLES.find(r => String(r.id) === String(user.roleId || user.role) || r.name.toLowerCase() === String(user.role).toLowerCase())?.name || user.role || 'employee'}
                            </span>
                          )}
                        </td>

                        {/* Position / Designation */}
                        <td className="py-4 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {getDesignationName(user) || '—'}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {statusKey}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleViewClick(user)}
                              className="p-2 bg-slate-100 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                              title="View details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleEditClick(user)}
                              className="p-2 bg-slate-100 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                              title="Edit records"
                            >
                              <Edit3 size={14} />
                            </button>
                            {!isHr && (
                              <button
                                onClick={() => handlePermissionClick(user)}
                                className="p-2 bg-slate-100 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                                title="Manage Permissions"
                              >
                                <ShieldCheck size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.id || user._id, user.name)}
                              className="p-2 bg-slate-100 hover:bg-rose-600 hover:text-white dark:bg-slate-800 dark:hover:bg-rose-600 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                              title="Delete employee"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredUsers.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between px-2 py-3">
            <p className="text-xs text-slate-400 font-semibold">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredUsers.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} employees
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-xs">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 text-xs font-bold rounded-lg border transition-all ${currentPage === p
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600'
                        }`}
                    >
                      {p}
                    </button>
                  )
                )
              }
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}

      </div>

      {/* CREATE & EDIT & VIEW MODALS */}
      <AnimatePresence>
        {isCreateOpen && (
          <CreateModal
            onClose={() => setIsCreateOpen(false)}
            refresh={fetchUsers}
            getAuthHeaders={getAuthHeaders}
            designations={designations}
            onDesignationCreated={handleDesignationCreated}
            onDesignationUpdated={handleDesignationUpdated}
            onDesignationDeleted={handleDesignationDeleted}
            departments={departments}
            showToast={showToast}
          />
        )}
        {isEditOpen && selectedUser && (
          <EditModal
            user={selectedUser}
            onClose={() => {
              setIsEditOpen(false);
              setSelectedUser(null);
            }}
            refresh={fetchUsers}
            getAuthHeaders={getAuthHeaders}
            designations={designations}
            onDesignationCreated={handleDesignationCreated}
            onDesignationUpdated={handleDesignationUpdated}
            onDesignationDeleted={handleDesignationDeleted}
            departments={departments}
            showToast={showToast}
          />
        )}
        {isViewOpen && selectedUser && (
          <ViewModal
            user={selectedUser}
            getDesignationName={getDesignationName}
            getDepartmentName={getDepartmentName}
            onClose={() => {
              setIsViewOpen(false);
              setSelectedUser(null);
            }}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteUserConfirm.isOpen}
        onClose={() => setDeleteUserConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={handleConfirmDeleteUser}
        title="Delete Employee?"
        message={`Are you absolutely sure you want to delete employee "${deleteUserConfirm.name}"? This action is permanent and cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type="danger"
      />

      <PermissionModal
        isOpen={isPermissionOpen}
        onClose={() => {
          setIsPermissionOpen(false);
          setPermissionUser(null);
        }}
        user={permissionUser}
        onSave={fetchUsers}
        showToast={showToast}
        getAuthHeaders={getAuthHeaders}
      />
    </div>
  );
};

const ManageDesignationsModal = ({ onClose, designations, getAuthHeaders, onDesignationUpdated, onDesignationDeleted, showToast }) => {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteDesignationConfirm, setDeleteDesignationConfirm] = useState({ isOpen: false, id: null, name: '' });

  useLockBodyScroll(true);

  const handleEditStart = (id, currentName) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleEditSave = async (id) => {
    if (!editName.trim()) return;
    setSavingId(id);
    try {
      const res = await fetch(`${API_BASE}/v1/designations/${id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editName.trim() })
      });
      const data = await res.json();

      if (!res.ok && !data.success) {
        showToast(data.message || data.error || 'Failed to update designation.', 'error');
        return;
      }

      onDesignationUpdated(data.data);
      setEditingId(null);
      showToast('Designation updated successfully.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error updating designation.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = (id, name) => {
    setDeleteDesignationConfirm({ isOpen: true, id, name });
  };

  const handleConfirmDeleteDesignation = async () => {
    const { id, name } = deleteDesignationConfirm;
    setDeleteDesignationConfirm({ isOpen: false, id: null, name: '' });
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/v1/designations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (!res.ok && !data.success) {
        showToast(data.message || data.error || 'Failed to delete designation.', 'error');
        return;
      }

      onDesignationDeleted(id);
      showToast('Designation deleted successfully.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error deleting designation.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-xl max-h-[85vh] flex flex-col my-auto"
      >
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Manage Designations</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {designations.map(d => {
            const dId = d.id || d._id;
            return (
              <div key={dId} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 gap-2">
                {editingId === dId ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                ) : (
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{d.name}</span>
                )}

                <div className="flex gap-1.5 shrink-0">
                  {editingId === dId ? (
                    <>
                      <button
                        onClick={() => handleEditSave(dId)}
                        disabled={savingId === dId}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                      >
                        {savingId === dId ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEditStart(dId, d.name)}
                        className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg"
                        title="Edit Name"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(dId, d.name)}
                        disabled={deletingId === dId}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {designations.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No designations available.</p>
          )}
        </div>

        <ConfirmModal
          isOpen={deleteDesignationConfirm.isOpen}
          onClose={() => setDeleteDesignationConfirm({ isOpen: false, id: null, name: '' })}
          onConfirm={handleConfirmDeleteDesignation}
          title="Delete Designation"
          message={`Are you sure you want to delete the designation "${deleteDesignationConfirm.name}"?`}
          confirmText="Yes, Delete"
          cancelText="Cancel"
          type="danger"
        />
      </motion.div>
    </div>,
    document.body
  );
};

const DesignationSelect = ({
  value,
  onChange,
  designations,
  getAuthHeaders,
  onDesignationCreated,
  onDesignationUpdated,
  onDesignationDeleted,
  showToast
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

  const handleAddDesignation = async () => {
    const name = window.prompt('Enter designation name');
    if (!name?.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch(`${API_BASE}/v1/designations`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await res.json();

      if (!res.ok && !data.success) {
        showToast(data.message || data.error || 'Failed to add designation.', 'error');
        return;
      }

      const designation = data.data;
      onDesignationCreated(designation);
      onChange(String(designation.id));
      showToast('Designation added successfully.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error creating designation.', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="flex gap-2 w-full items-center">
        <div className="flex-1">
          <select name="designation" className="w-full text-xs py-2 border rounded-xl px-3 outline-none focus:ring-1 border-slate-200 dark:border-slate-700 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-850 dark:text-white" value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select Designation</option>
            {designations.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAddDesignation}
          disabled={isAdding}
          title="Add designation"
          className="shrink-0 h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all duration-300 hover:scale-[1.03] active:scale-95 disabled:opacity-60"
        >
          {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </button>
        <button
          type="button"
          onClick={() => setIsManageOpen(true)}
          title="Edit/Delete designations"
          className="shrink-0 h-11 w-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all duration-300 hover:scale-[1.03] active:scale-95"
        >
          <Edit3 size={16} />
        </button>
      </div>

      <AnimatePresence>
        {isManageOpen && (
          <ManageDesignationsModal
            onClose={() => setIsManageOpen(false)}
            designations={designations}
            getAuthHeaders={getAuthHeaders}
            onDesignationUpdated={onDesignationUpdated}
            onDesignationDeleted={onDesignationDeleted}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// --- CREATE MODAL ---
const CreateModal = ({ onClose, refresh, getAuthHeaders, designations, onDesignationCreated, onDesignationUpdated, onDesignationDeleted, showToast }) => {
  useLockBodyScroll(true);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    role: 'employee',
    designation: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Name is required.', 'warning');
      return;
    }

    // Phone number validation
    if (!/^\d{10}$/.test(form.phone || '')) {
      showToast('Phone number must be exactly 10 digits.', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const fd = new FormData();

      const employeeName = form.name.trim();
      const employeePhone = form.phone.trim();

      const namePart = employeeName.slice(0, 3).toUpperCase();
      const phonePart = employeePhone.slice(-3) || "123";
      const dynamicPassword = `${namePart}${phonePart}`;

      // Auto-generate required backend fallback fields if not provided
      const autoEmail = `${employeeName.toLowerCase().replace(/[^a-z0-9]/g, '')}${employeePhone.slice(-4)}@fabtec.com`;
      const autoEmpId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

      fd.append('name', employeeName);
      fd.append('phone', employeePhone);
      fd.append('role', form.role || 'employee');
      if (form.designation) {
        fd.append('designation', form.designation);
      }
      fd.append('email', autoEmail);
      fd.append('employeeId', autoEmpId);
      fd.append('password', dynamicPassword);
      fd.append('status', 'active');
      fd.append('joining_date', new Date().toISOString().split('T')[0]);

      const res = await fetch(`${API_BASE}/v1/users/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: fd
      });

      const data = await res.json();
      if (res.ok || data.success) {
        showToast(`Employee created successfully!`, 'success');
        await refresh();
        onClose();
      } else {
        showToast(data.message || data.error || 'Failed to onboard employee.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error connecting to the onboard api.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex justify-center items-center p-4 overflow-hidden"
    >
      <motion.div
        initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg flex flex-col rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden my-auto"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X size={20} /></button>

        <header className="mb-6">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">ADD <span className="text-indigo-600 dark:text-indigo-400">EMPLOYEE</span></h2>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Name - Required */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider block">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="name"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-850 dark:text-white"
                placeholder="Enter full name"
                value={form.name}
                onChange={handleInputChange}
              />
            </div>

            {/* Phone Number - Required */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider block">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="phone"
                type="tel"
                maxLength={10}
                className={`w-full border rounded-xl px-3 py-2 text-sm outline-none transition focus:ring-1 ${form.phone && form.phone.length !== 10
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-850 dark:text-white'
                  }`}
                placeholder="10-digit phone number"
                value={form.phone}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm(prev => ({ ...prev, phone: digits }));
                }}
              />
              {form.phone && form.phone.length !== 10 && (
                <p className="text-[10px] text-red-500 ml-1">Must be 10 digits.</p>
              )}
            </div>

            {/* Role - Optional */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider block">
                Role
              </label>
              <select
                name="role"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-850 dark:text-white"
                value={form.role}
                onChange={handleInputChange}
              >
                {ROLES.map(r => (
                  <option key={r.id} value={r.name}>{r.name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Position / Designation - Optional */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider block">
                Position / Designation
              </label>
              <DesignationSelect
                value={form.designation}
                onChange={(designation) => setForm(prev => ({ ...prev, designation }))}
                designations={designations}
                getAuthHeaders={getAuthHeaders}
                onDesignationCreated={onDesignationCreated}
                onDesignationUpdated={onDesignationUpdated}
                onDesignationDeleted={onDesignationDeleted}
                showToast={showToast}
              />
            </div>
          </div>

          <button
            disabled={isSubmitting}
            className="w-full mt-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl uppercase text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Add Employee
          </button>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  );
};

// --- EDIT MODAL ---
const EditModal = ({ user, onClose, refresh, getAuthHeaders, designations, onDesignationCreated, onDesignationUpdated, onDesignationDeleted, showToast }) => {
  useLockBodyScroll(true);

  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    role: user.role || 'employee',
    designation: user.designationId || user.designation || '',
    status: user.status || (user.isActive ? 'active' : 'inactive')
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!form.designation || designations.some(d => String(d.id || d._id) === String(form.designation))) return;

    const matchingDesignation = designations.find(d => d.name.toLowerCase() === String(form.designation).toLowerCase());
    if (matchingDesignation) {
      setForm(prev => ({ ...prev, designation: String(matchingDesignation.id || matchingDesignation._id) }));
    }
  }, [designations, form.designation]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Name is required.', 'warning');
      return;
    }

    if (!/^\d{10}$/.test(form.phone || '')) {
      showToast('Phone number must be exactly 10 digits.', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('phone', form.phone.trim());
      fd.append('role', form.role || 'employee');
      fd.append('status', form.status || 'active');
      if (form.designation) {
        fd.append('designation', form.designation);
      }

      const res = await fetch(`${API_BASE}/v1/users/update/${user.id || user._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: fd
      });

      const data = await res.json();
      if (res.ok || data.success) {
        showToast('Employee updated successfully.', 'success');
        await refresh();
        onClose();
      } else {
        showToast(data.message || data.error || 'Update failed.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error updating employee.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex justify-center items-center p-4 overflow-hidden"
    >
      <motion.div
        initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg flex flex-col rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden my-auto"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X size={20} /></button>

        <header className="mb-6">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">EDIT <span className="text-indigo-600 dark:text-indigo-400">EMPLOYEE</span></h2>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Name - Required */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider block">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="name"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-850 dark:text-white"
                placeholder="Enter full name"
                value={form.name}
                onChange={handleInputChange}
              />
            </div>

            {/* Phone Number - Required */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider block">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="phone"
                type="tel"
                maxLength={10}
                className={`w-full border rounded-xl px-3 py-2 text-sm outline-none transition focus:ring-1 ${form.phone && form.phone.length !== 10
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-850 dark:text-white'
                  }`}
                placeholder="10-digit phone number"
                value={form.phone}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm(prev => ({ ...prev, phone: digits }));
                }}
              />
              {form.phone && form.phone.length !== 10 && (
                <p className="text-[10px] text-red-500 ml-1">Must be 10 digits.</p>
              )}
            </div>

            {/* Role - Optional */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider block">
                Role
              </label>
              <select
                name="role"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-850 dark:text-white"
                value={form.role}
                onChange={handleInputChange}
              >
                {ROLES.map(r => (
                  <option key={r.id} value={r.name}>{r.name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Position / Designation - Optional */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider block">
                Position / Designation
              </label>
              <DesignationSelect
                value={form.designation}
                onChange={(designation) => setForm(prev => ({ ...prev, designation }))}
                designations={designations}
                getAuthHeaders={getAuthHeaders}
                onDesignationCreated={onDesignationCreated}
                onDesignationUpdated={onDesignationUpdated}
                onDesignationDeleted={onDesignationDeleted}
                showToast={showToast}
              />
            </div>

            {/* Status - Active / Inactive Buttons */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider block">
                Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, status: 'active' }))}
                  className={`py-2 px-3 rounded-xl text-xs font-bold uppercase transition cursor-pointer flex items-center justify-center gap-2 border ${
                    form.status === 'active'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, status: 'inactive' }))}
                  className={`py-2 px-3 rounded-xl text-xs font-bold uppercase transition cursor-pointer flex items-center justify-center gap-2 border ${
                    form.status === 'inactive'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Inactive
                </button>
              </div>
            </div>
          </div>

          <button
            disabled={isSubmitting}
            className="w-full mt-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl uppercase text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Save Changes
          </button>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  );
};

// --- VIEW MODAL ---
const ViewModal = ({ user, onClose, getDesignationName }) => {
  useLockBodyScroll(true);

  const [activeTab, setActiveTab] = useState('dossier');
  const [imgError, setImgError] = useState(false);
  const avatarUrl = user.avatar || user.profile_image || user.profileImage;
  const statusKey = user.status || (user.isActive ? 'active' : 'inactive');
  const meta = STATUS_META[statusKey] || STATUS_META.active;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex justify-center items-center p-4 overflow-hidden"
    >
      <motion.div
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg flex flex-col rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden my-auto text-slate-800 dark:text-slate-100"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80 pr-10">
          <div className="relative shrink-0">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={user.name}
                onError={() => setImgError(true)}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shadow-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : <User size={24} />}
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${meta.dot}`} />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {user.name}
            </h2>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {statusKey}
            </span>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800/80 mb-4">
          <button
            onClick={() => setActiveTab('dossier')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'dossier'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Employee Details
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'performance'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Performance Metrics
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
          {activeTab === 'dossier' ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{user.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Phone Number</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{user.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Role</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-xs">{user.role || 'employee'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Position / Designation</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">{getDesignationName(user) || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Status</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.color}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {statusKey}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <PerformanceTab employeeId={user.id || user._id} employeeName={user.name} />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default Users;
