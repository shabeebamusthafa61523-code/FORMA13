import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const getApiEndpoint = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE.endsWith('/v1')) {
    return `${API_BASE}${cleanPath}`;
  }
  if (API_BASE.endsWith('/api')) {
    return `${API_BASE}/v1${cleanPath}`;
  }
  return `${API_BASE}/api/v1${cleanPath}`;
};

const SidebarPermissionsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiEndpoint('/users'), {
        headers: getAuthHeaders()
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON response (${res.status})`);
      }
      const data = await res.json();
      if (res.ok && data.data) {
        setUsers(Array.isArray(data.data) ? data.data : []);
      } else {
        showToast(data.message || "Failed to load users", "error");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      showToast("Error loading users.", "error");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || 
      (u.name || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q) ||
      (u.designation || u.designationName || '').toLowerCase().includes(q);

    if (!matchSearch) return false;

    if (filterType === 'configured') {
      return Array.isArray(u.permissions) && u.permissions.length > 0;
    }
    if (filterType === 'unconfigured') {
      return !u.permissions || u.permissions.length === 0;
    }
    return true;
  });

  const handleConfigureUser = (userId) => {
    navigate(`/permissions/${userId}`);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-500">Loading Users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sidebar Permissions
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Configure menu access permissions for each staff member
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <span className="px-3.5 py-1.5 bg-slate-100 rounded-xl">
            {users.length} Total Users
          </span>
          <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
            {users.filter(u => u.permissions && u.permissions.length > 0).length} Configured
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user by name, email, or department..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'configured', 'unconfigured'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-3 rounded-xl text-sm font-semibold capitalize transition cursor-pointer ${
                filterType === type
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="py-4 px-6">User</th>
              <th className="py-4 px-6">Department & Designation</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-base font-medium text-slate-800">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 font-semibold">
                  No matching users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isConfigured = u.permissions && u.permissions.length > 0;
                return (
                  <tr key={u._id || u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-sm text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-700">{u.department || 'General Staff'}</div>
                      <div className="text-sm text-slate-500">{u.designation || u.role || 'Staff'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        isConfigured ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isConfigured ? `${u.permissions.length} Custom Pages` : 'Default'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleConfigureUser(u._id || u.id)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition cursor-pointer"
                      >
                        Configure Access
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SidebarPermissionsPage;
