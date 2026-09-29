import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  PlusCircle, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  X, 
  CheckCircle2, 
  Clock, 
  FileText, 
  DollarSign, 
  TrendingUp,
  Receipt,
  Building2,
  Calendar
} from 'lucide-react';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';
import ExcelExportButton from '../ExcelExportButton';
import AddItemOptionModal from './AddItemOptionModal';
import { getClients } from '../../services/clientService';

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

const getAuthHeaders = () => {
  const rawToken = localStorage.getItem('token') || '';
  const cleanToken = rawToken.replace(/^"(.*)"$/, '$1').trim();
  return {
    'Content-Type': 'application/json',
    'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`
  };
};

const SalesTab = () => {
  const { showToast } = useToast();
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const fetchClientList = async () => {
      setLoadingClients(true);
      try {
        const res = await getClients({ limit: 1000 });
        let list = [];
        if (res && res.success && res.data && Array.isArray(res.data.clients)) {
          list = res.data.clients;
        } else if (res && res.success && Array.isArray(res.data)) {
          list = res.data;
        } else if (res && Array.isArray(res.clients)) {
          list = res.clients;
        } else if (Array.isArray(res)) {
          list = res;
        }
        setClients(list);
      } catch (err) {
        console.error('Error fetching clients:', err);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClientList();
  }, []);
  
  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [itemOptions, setItemOptions] = useState(() => {
    const saved = localStorage.getItem('crm_item_options');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return ['Poster', 'Brochure', 'Website', 'Domain', 'Server', 'Web Development', 'Annual Subscription'];
  });
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  const [showGstRate, setShowGstRate] = useState(false);
  const [formData, setFormData] = useState({
    invoiceNo: '',
    clientName: '',
    productName: '',
    saleDate: new Date().toISOString().split('T')[0],
    amount: '',
    gstRate: '0',
    paymentStatus: 'Paid',
    paymentMethod: 'Bank Transfer',
    remarks: ''
  });

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiEndpoint('/accounts/income'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setSales(data.data);
        }
      } else {
        const saved = localStorage.getItem('crm_sales_records');
        if (saved) setSales(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Error loading sales data:', e);
      const saved = localStorage.getItem('crm_sales_records');
      if (saved) setSales(JSON.parse(saved));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const handleCreateSale = async (e) => {
    e.preventDefault();
    if (!formData.clientName || !formData.amount || !formData.productName) {
      showToast('Please fill in Client Name, Product/Service, and Amount.', 'warning');
      return;
    }

    const amt = parseFloat(formData.amount) || 0;
    const gstPct = parseFloat(formData.gstRate) || 0;
    const gstAmt = (amt * gstPct) / 100;
    const totalAmt = amt + gstAmt;

    const newSaleEntry = {
      _id: `sale_${Date.now()}`,
      invoiceNo: formData.invoiceNo || `INV-SL-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: formData.clientName.trim(),
      title: formData.productName.trim(),
      date: formData.saleDate,
      amount: amt,
      gstAmount: gstAmt,
      totalAmount: totalAmt,
      receiptAmount: formData.paymentStatus === 'Paid' ? totalAmt : (formData.paymentStatus === 'Partial' ? totalAmt / 2 : 0),
      status: formData.paymentStatus,
      paymentMethod: formData.paymentMethod,
      department: 'Sales & CRM',
      remarks: formData.remarks.trim()
    };

    try {
      const res = await fetch(getApiEndpoint('/accounts/income'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newSaleEntry)
      });
      if (res.ok) {
        showToast('Sales record added successfully!', 'success');
      } else {
        const updated = [newSaleEntry, ...sales];
        setSales(updated);
        localStorage.setItem('crm_sales_records', JSON.stringify(updated));
        showToast('Sales record saved locally!', 'success');
      }
    } catch (e) {
      const updated = [newSaleEntry, ...sales];
      setSales(updated);
      localStorage.setItem('crm_sales_records', JSON.stringify(updated));
      showToast('Sales record saved!', 'success');
    }

    setIsAddModalOpen(false);
    setFormData({
      invoiceNo: '',
      clientName: '',
      productName: '',
      saleDate: new Date().toISOString().split('T')[0],
      amount: '',
      gstRate: '18',
      paymentStatus: 'Paid',
      paymentMethod: 'Bank Transfer',
      remarks: ''
    });
    fetchSalesData();
  };

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

  const triggerDeleteSale = (id) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleExecuteDeleteSale = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, id: null });
    if (!id) return;

    try {
      await fetch(getApiEndpoint(`/accounts/income/${id}`), { method: 'DELETE', headers: getAuthHeaders() });
    } catch (e) {
      // Local filter fallback
    }
    const updated = sales.filter(s => String(s._id || s.id) !== String(id));
    setSales(updated);
    localStorage.setItem('crm_sales_records', JSON.stringify(updated));
    showToast('Sales entry deleted.', 'success');
  };

  // Filtered sales
  const filteredSales = sales.filter(s => {
    const matchesSearch = 
      (s.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.invoiceNo || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (s.status || 'Paid').toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalSalesRevenue = sales.reduce((sum, s) => sum + (Number(s.totalAmount || s.receiptAmount || s.amount) || 0), 0);
  const totalPaidRevenue = sales.reduce((sum, s) => sum + (s.status === 'Paid' ? (Number(s.totalAmount || s.receiptAmount || s.amount) || 0) : 0), 0);
  const totalPendingRevenue = sales.reduce((sum, s) => sum + (s.status === 'Pending' || s.status === 'UNPAID' ? (Number(s.totalAmount || s.receiptAmount || s.amount) || 0) : 0), 0);

  return (
    <div className="space-y-2.5">
      {/* 1-Row Sleek Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-xl p-2.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
              Sales Ledger & Revenue Billing
            </h3>
          </div>
        </div>

        {/* Right Search, Filters & Action Button */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Client, Product, Invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Pending">Pending</option>
          </select>

          {/* Export Excel Button */}
          <ExcelExportButton
            data={filteredSales.map(s => ({
              'Date': s.date ? new Date(s.date).toISOString().split('T')[0] : '',
              'Invoice No': s.referenceNo || s.invoiceNo || '',
              'Client / Company': (typeof s.client === 'object' && s.client?.companyName) || s.clientName || 'N/A',
              'Payment Mode': s.paymentMethod || s.paymentMode || '',
              'Status': s.status || '',
              'Total Amount (₹)': Number(s.totalAmount || s.amount || 0)
            }))}
            fileName="Sales_Ledger_List"
            sheetName="Sales"
            title="Export Excel"
          />

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <PlusCircle size={13} />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Sales Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-900 border border-blue-500/20 dark:border-blue-500/30 rounded-xl p-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Total Sales Revenue</p>
            <TrendingUp size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
            ₹{totalSalesRevenue.toLocaleString('en-IN')}
          </h4>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl p-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Paid Receipts</p>
            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h4 className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
            ₹{totalPaidRevenue.toLocaleString('en-IN')}
          </h4>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-amber-500/20 dark:border-amber-500/30 rounded-xl p-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Pending Outstandings</p>
            <Clock size={14} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h4 className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
            ₹{totalPendingRevenue.toLocaleString('en-IN')}
          </h4>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Total Sales Count</p>
            <ShoppingBag size={14} className="text-slate-600 dark:text-slate-400" />
          </div>
          <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
            {sales.length}
          </h4>
        </div>
      </div>

      {/* Inline Create Sales Invoice Entry Form (In Page Itself) */}
      {isAddModalOpen && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-5 mb-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" /> Create Sales Invoice Entry
            </h3>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Cancel & Back to List
            </button>
          </div>

          <form onSubmit={handleCreateSale} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-500 mb-1">Invoice / Ref No.</label>
                <input
                  type="text"
                  placeholder="Auto-generated if empty"
                  value={formData.invoiceNo}
                  onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-500 mb-1">Sale Date *</label>
                <input
                  type="date"
                  required
                  value={formData.saleDate}
                  onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-500 mb-1">Client / Company Name *</label>
                {clients.length > 0 && (
                  <select
                    value={clients.some(c => (c.companyName || c.clientName || c.name) === formData.clientName) ? formData.clientName : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setFormData({ ...formData, clientName: e.target.value });
                      }
                    }}
                    className="w-full mb-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-100 text-xs cursor-pointer"
                  >
                    <option value="">-- Select Registered Client / Company --</option>
                    {clients.map((c) => {
                      const cId = c._id || c.id;
                      const company = c.companyName || '';
                      const person = c.clientName || c.contactPerson || c.name || '';
                      const nameStr = company && person && company !== person ? `🏢 ${company} (${person})` : `🏢 ${company || person || 'Client'}`;
                      const valueStr = company || person || 'Client';
                      return (
                        <option key={cId} value={valueStr}>
                          {nameStr}
                        </option>
                      );
                    })}
                  </select>
                )}
                {/* <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp / John Doe"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                /> */}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-500">Product / Service Sold *</label>
                  <button
                    type="button"
                    onClick={() => setIsAddItemModalOpen(true)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Manage products and services"
                  >
                    <PlusCircle size={13} />
                    <span>+ Manage Products</span>
                  </button>
                </div>
                {itemOptions.length > 0 && (
                  <select
                    value={itemOptions.includes(formData.productName) ? formData.productName : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setFormData({ ...formData, productName: e.target.value });
                      }
                    }}
                    className="w-full mb-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-100 text-xs cursor-pointer"
                  >
                    <option value="">-- Select Registered Product / Service --</option>
                    {itemOptions.map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
                {/* <input
                  type="text"
                  required
                  placeholder="e.g. Web Development / Annual Subscription"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium"
                /> */}
              </div>
            </div>

            <div className={`grid grid-cols-1 ${showGstRate ? 'md:grid-cols-2' : ''} gap-4`}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-500">Base Amount (₹) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (showGstRate) {
                        setShowGstRate(false);
                        setFormData(prev => ({ ...prev, gstRate: '0' }));
                      } else {
                        setShowGstRate(true);
                        setFormData(prev => ({ ...prev, gstRate: '18' }));
                      }
                    }}
                    className={`text-xs font-bold transition flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-lg border ${
                      showGstRate
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400'
                        : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'
                    }`}
                  >
                    <Receipt size={12} />
                    <span>{showGstRate ? '- Hide GST' : '+ Add GST Rate'}</span>
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono font-bold"
                />
              </div>
              {showGstRate && (
                <div>
                  <label className="block font-bold text-slate-500 mb-1">GST Rate (%)</label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold cursor-pointer"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-500 mb-1">Payment Status</label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold cursor-pointer"
                >
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-500 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI / QR Code">UPI / QR Code</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-500 mb-1">Remarks / Notes</label>
              <textarea
                rows={2}
                placeholder="Additional sales remarks..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Create Invoice
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sales Transactions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Billing Ledger</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-y border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Invoice No</th>
                <th className="py-2.5 px-3">Client / Organization</th>
                <th className="py-2.5 px-3">Product / Service</th>
                <th className="py-2.5 px-3">Sale Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr><td colSpan={7} className="py-6 text-center text-slate-400">Loading sales entries...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-slate-400">No sales entries recorded.</td></tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s._id || s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{s.invoiceNo || `INV-SL-${s._id.slice(-4)}`}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{s.clientName}</td>
                    <td className="py-3 px-3">{s.title || 'Product Sale'}</td>
                    <td className="py-3 px-3 text-slate-500">{new Date(s.date || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        (s.status || 'Paid') === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        (s.status || '').toLowerCase() === 'partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                        'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {s.status || 'Paid'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                      ₹{(Number(s.totalAmount || s.receiptAmount || s.amount) || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => { setSelectedSale(s); setIsViewModalOpen(true); }}
                          className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                          title="View Sale Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteSale(s._id || s.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Delete Sale Record"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* VIEW SALE DETAILS MODAL */}
      {isViewModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" /> Sale Record Details
              </h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">Invoice No</span>
                  <span className="font-mono font-bold text-blue-600">{selectedSale.invoiceNo || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">Client</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedSale.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">Product / Service</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedSale.title || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">Sale Date</span>
                  <span>{new Date(selectedSale.date || Date.now()).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">Payment Status</span>
                  <span className="font-bold text-emerald-600">{selectedSale.status || 'Paid'}</span>
                </div>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-950/30 p-3.5 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-slate-600 dark:text-slate-300">Total Billed Revenue</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                  ₹{(Number(selectedSale.totalAmount || selectedSale.receiptAmount || selectedSale.amount) || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewport Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleExecuteDeleteSale}
        title="Delete Sales Record"
        message="Are you sure you want to delete this sales record? This action cannot be undone."
        confirmText="Delete Sales Record"
        type="danger"
      />

      {/* Product / Service Option Directory Management Modal */}
      <AddItemOptionModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        itemOptions={itemOptions}
        onUpdateOptions={(opts) => {
          setItemOptions(opts);
          localStorage.setItem('crm_item_options', JSON.stringify(opts));
        }}
        onSelectItem={(prodName) => setFormData(prev => ({ ...prev, productName: prodName }))}
      />
    </div>
  );
};

export default SalesTab;
