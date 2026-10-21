import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Hammer, Search, Plus, Loader2, ArrowRight, Phone, MapPin, 
  CheckCircle2, Clock, AlertCircle, Trash2, Calendar, 
  DollarSign, RefreshCw, X, TrendingUp, Building2
} from 'lucide-react';
import { 
  getFabricationJobs, 
  createFabricationJob, 
  deleteFabricationJob 
} from '../services/fabricationService';
import { getClients } from '../services/clientService';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';

const statusColors = {
  'Quotation Stage': 'bg-amber-100 text-amber-800 border-amber-200',
  'Confirmed / In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
  'On Hold': 'bg-orange-100 text-orange-800 border-orange-200',
  'Completed': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Cancelled': 'bg-rose-100 text-rose-800 border-rose-200'
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

const FabricationPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [jobs, setJobs] = useState([]);
  const [metrics, setMetrics] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalQuoted: 0,
    totalReceived: 0,
    totalDirectCost: 0,
    totalBalanceDue: 0,
    totalNetProfit: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Existing clients for dropdown
  const [clientsList, setClientsList] = useState([]);

  // New Job Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newJobForm, setNewJobForm] = useState({
    selectedClientId: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    siteAddress: '',
    status: 'Confirmed / In Progress',
    startDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    notes: ''
  });

  // Delete Job State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFabricationJobs({
        search,
        status: statusFilter
      });
      if (res && res.success) {
        setJobs(res.data.jobs || []);
        if (res.data.metrics) {
          setMetrics(res.data.metrics);
        }
      } else {
        showToast(res?.message || 'Failed to load fabrication jobs', 'error');
      }
    } catch (err) {
      console.error('Error fetching fabrication jobs:', err);
      showToast('Error loading fabrication jobs', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showToast]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await getClients({ limit: 100 });
      if (res && res.success) {
        setClientsList(res.data.clients || []);
      }
    } catch (err) {
      console.error('Failed to load clients list:', err);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleClientSelectChange = (e) => {
    const cId = e.target.value;
    setNewJobForm(prev => {
      if (!cId) {
        return {
          ...prev,
          selectedClientId: '',
          clientName: '',
          clientPhone: '',
          clientEmail: '',
          siteAddress: ''
        };
      }
      const selected = clientsList.find(c => c._id === cId || c.id === cId);
      if (selected) {
        return {
          ...prev,
          selectedClientId: cId,
          clientName: selected.clientName || selected.companyName || '',
          clientPhone: selected.phone || '',
          clientEmail: selected.email || '',
          siteAddress: selected.address || ''
        };
      }
      return { ...prev, selectedClientId: cId };
    });
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!newJobForm.selectedClientId || !newJobForm.clientName.trim()) {
      showToast('Please select a client from the directory', 'warning');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        client: newJobForm.selectedClientId,
        clientName: newJobForm.clientName.trim(),
        clientPhone: newJobForm.clientPhone.trim(),
        clientEmail: newJobForm.clientEmail.trim(),
        siteAddress: newJobForm.siteAddress.trim(),
        status: newJobForm.status,
        startDate: newJobForm.startDate ? new Date(newJobForm.startDate) : new Date(),
        deliveryDate: newJobForm.deliveryDate ? new Date(newJobForm.deliveryDate) : undefined,
        notes: newJobForm.notes.trim()
      };

      const res = await createFabricationJob(payload);
      if (res && res.success) {
        showToast('Workspace job created successfully!', 'success');
        setIsCreateOpen(false);
        setNewJobForm({
          selectedClientId: '',
          clientName: '',
          clientPhone: '',
          clientEmail: '',
          siteAddress: '',
          status: 'Confirmed / In Progress',
          startDate: new Date().toISOString().split('T')[0],
          deliveryDate: '',
          notes: ''
        });
        fetchJobs();
        // Redirect directly to the newly created job
        if (res.data?._id) {
          navigate(`/fabrication/${res.data._id}`);
        }
      } else {
        showToast(res?.message || 'Failed to create fabrication job', 'error');
      }
    } catch (err) {
      console.error('Error creating job:', err);
      showToast(err.response?.data?.message || 'Failed to create fabrication job', 'error');
    } finally {
      setCreating(false);
    }
  };

  const promptDeleteJob = (job, e) => {
    e.stopPropagation();
    setJobToDelete(job);
    setDeleteModalOpen(true);
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteFabricationJob(jobToDelete._id);
      if (res && res.success) {
        showToast('Fabrication job deleted successfully', 'success');
        setJobs(prev => prev.filter(j => j._id !== jobToDelete._id));
        fetchJobs();
      } else {
        showToast(res?.message || 'Failed to delete fabrication job', 'error');
      }
    } catch (err) {
      console.error('Error deleting job:', err);
      showToast('Error deleting job', 'error');
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setJobToDelete(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Hammer size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Workspace & Job Ledger
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage client projects, quotations, employee daily wages, materials & client payments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh jobs"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>New Workspace Job</span>
          </button>
        </div>
      </div>

      {/* 2. Top Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quoted Pipeline */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Quoted</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
              <DollarSign size={16} />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(metrics.totalQuoted)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {metrics.totalJobs} recorded jobs
          </div>
        </div>

        {/* Amount Given by Clients */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Amount Received</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(metrics.totalReceived)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Total advances & installments received
          </div>
        </div>

        {/* Direct Costs Incurred */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Direct Costs</span>
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(metrics.totalDirectCost)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Purchases + Wages + Site Expenses
          </div>
        </div>

        {/* Outstanding Balance Due */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Balance Due</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <AlertCircle size={16} />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(metrics.totalBalanceDue)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Pending receivable from clients
          </div>
        </div>
      </div>

      {/* 3. Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, phone, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', 'Confirmed / In Progress', 'Quotation Stage', 'Completed', 'On Hold'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Jobs List Table / Grid */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 size={32} className="animate-spin text-indigo-600 mb-2" />
          <p className="text-sm">Loading workspace jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mb-3">
            <Hammer size={24} />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            No workspace jobs found
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mb-4">
            {search || statusFilter !== 'All' 
              ? 'Try modifying your search or filter criteria.' 
              : 'Create your first client project to start managing quotations, wages, and materials.'}
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Create New Job</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Job & Client Details</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Quotation</th>
                  <th className="py-3.5 px-4 text-right">Costs Incurred</th>
                  <th className="py-3.5 px-4 text-right">Amount Given</th>
                  <th className="py-3.5 px-4 text-right">Balance Due</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {jobs.map((job) => {
                  const fin = job.financials || {};
                  return (
                    <tr
                      key={job._id}
                      onClick={() => navigate(`/fabrication/${job._id}`)}
                      className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      {/* Job & Client */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold border border-slate-200 dark:border-slate-700">
                              {job.jobId}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                              {job.clientName}
                            </span>
                          </div>
                          {job.clientPhone && (
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                              📞 {job.clientPhone}
                            </div>
                          )}
                          {job.siteAddress && (
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-xs">
                              <MapPin size={12} className="shrink-0" />
                              <span className="truncate">{job.siteAddress}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          statusColors[job.status] || 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {job.status}
                        </span>
                      </td>

                      {/* Quoted Total */}
                      <td className="py-4 px-4 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(fin.totalQuotation)}
                      </td>

                      {/* Costs Incurred */}
                      <td className="py-4 px-4 text-right text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">
                        {formatCurrency(fin.totalDirectCost)}
                      </td>

                      {/* Amount Given */}
                      <td className="py-4 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                        {formatCurrency(fin.totalAmountReceived)}
                      </td>

                      {/* Balance Due */}
                      <td className="py-4 px-4 text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {formatCurrency(fin.balanceDue)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/fabrication/${job._id}`)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Open Job Ledger"
                          >
                            <ArrowRight size={18} />
                          </button>
                          <button
                            onClick={(e) => promptDeleteJob(job, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete Job"
                          >
                            <Trash2 size={16} />
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

      {/* 5. Create New Fabrication Job Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
                  <Hammer size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    New Workspace Job
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create a client job card to start tracking quotation, wages & costs.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              {/* Select Client */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Client <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={newJobForm.selectedClientId}
                  onChange={handleClientSelectChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="">-- Choose from client directory --</option>
                  {clientsList.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.companyName ? `${c.companyName} (${c.clientName})` : c.clientName}
                    </option>
                  ))}
                </select>
                {newJobForm.clientPhone && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Client Phone: <span className="font-semibold text-slate-700 dark:text-slate-300">{newJobForm.clientPhone}</span>
                  </p>
                )}
              </div>

              {/* Site Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Site / Installation Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Site 4B, Green Valley Villa, Kochi"
                  value={newJobForm.siteAddress}
                  onChange={(e) => setNewJobForm({ ...newJobForm, siteAddress: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Status and Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={newJobForm.status}
                    onChange={(e) => setNewJobForm({ ...newJobForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  >
                    <option value="Confirmed / In Progress">Confirmed / In Progress</option>
                    <option value="Quotation Stage">Quotation Stage</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newJobForm.startDate}
                    onChange={(e) => setNewJobForm({ ...newJobForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Delivery Date
                  </label>
                  <input
                    type="date"
                    value={newJobForm.deliveryDate}
                    onChange={(e) => setNewJobForm({ ...newJobForm, deliveryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scope & Project Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Key fabrication dimensions, metal specifications, coating notes..."
                  value={newJobForm.notes}
                  onChange={(e) => setNewJobForm({ ...newJobForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  <span>Create & Open Job</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setJobToDelete(null);
        }}
        onConfirm={confirmDeleteJob}
        title="Delete Fabrication Job"
        message={`Are you sure you want to permanently delete workspace job for "${jobToDelete?.clientName}" (${jobToDelete?.jobId})? All associated quotations, wage logs, material expenses, and payment records will be permanently removed.`}
        confirmText={deleting ? "Deleting..." : "Delete Job"}
        isDestructive={true}
      />
    </div>
  );
};

export default FabricationPage;
