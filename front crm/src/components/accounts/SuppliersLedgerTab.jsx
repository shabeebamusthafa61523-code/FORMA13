import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Search, 
  Calendar, 
  Filter, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  DollarSign, 
  Printer, 
  RefreshCw, 
  ShoppingCart, 
  TrendingDown, 
  Wallet,
  ArrowUpDown
} from 'lucide-react';
import { getVendors } from '../../services/accountsService';
import { useToast } from '../ToastProvider';
import ExcelExportButton from '../ExcelExportButton';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const getApiEndpoint = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE.endsWith('/v1')) return `${API_BASE}${cleanPath}`;
  if (API_BASE.endsWith('/api')) return `${API_BASE}/v1${cleanPath}`;
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

const SuppliersLedgerTab = () => {
  const { showToast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  // Purchase Ledger Records
  const [purchases, setPurchases] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. Fetch Vendors
  const fetchVendorsList = useCallback(async () => {
    setLoadingVendors(true);
    try {
      const res = await getVendors();
      if (res && res.success && Array.isArray(res.data)) {
        setVendors(res.data);
        if (res.data.length > 0 && !selectedVendorId) {
          setSelectedVendorId(res.data[0]._id || res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching vendors for ledger:', err);
    } finally {
      setLoadingVendors(false);
    }
  }, [selectedVendorId]);

  useEffect(() => {
    fetchVendorsList();
  }, [fetchVendorsList]);

  // 2. Fetch Purchase Ledger Records
  const fetchPurchaseLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const savedLocal = JSON.parse(localStorage.getItem('crm_purchase_records') || '[]');
      const res = await fetch(getApiEndpoint('/accounts/expenses'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const filtered = data.data.filter(item => {
            const cat = String(item.categoryName || item.category || '').toLowerCase();
            return cat.includes('purchase') || cat.includes('inventory') || cat.includes('vendor') || item.isPurchase === true;
          });
          const combinedMap = new Map();
          savedLocal.forEach(p => combinedMap.set(String(p._id || p.id), p));
          filtered.forEach(p => combinedMap.set(String(p._id || p.id), p));
          setPurchases(Array.from(combinedMap.values()));
        } else {
          setPurchases(savedLocal);
        }
      } else {
        setPurchases(savedLocal);
      }
    } catch (err) {
      console.warn('Error loading purchase ledger:', err);
      const saved = localStorage.getItem('crm_purchase_records');
      if (saved) setPurchases(JSON.parse(saved));
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchaseLedger();
  }, [fetchPurchaseLedger]);

  // Get currently selected vendor object
  const selectedVendor = vendors.find(v => String(v._id || v.id) === String(selectedVendorId));
  const targetVendorName = (selectedVendor?.name || '').toLowerCase().trim();

  // Filter purchases by selected supplier
  const supplierPurchases = purchases.filter(p => {
    if (!selectedVendorId || selectedVendorId === 'ALL') return true;
    const vendorName = String(p.paidTo || p.vendorName || '').toLowerCase().trim();
    return vendorName === targetVendorName || (targetVendorName && vendorName.includes(targetVendorName));
  });

  // Apply Search, Status & Date Filters
  const filteredPurchases = supplierPurchases.filter(p => {
    // Status Filter
    if (statusFilter !== 'ALL') {
      const st = String(p.status || '').toUpperCase();
      if (statusFilter === 'APPROVED' && st !== 'APPROVED' && st !== 'PAID') return false;
      if (statusFilter === 'PARTIAL' && st !== 'PARTIAL' && st !== 'PARTIALLY_PAID') return false;
      if (statusFilter === 'PENDING' && st !== 'PENDING' && st !== 'UNPAID') return false;
    }

    // Date Range
    if (startDate) {
      const pDate = p.date ? new Date(p.date) : null;
      if (pDate && pDate < new Date(startDate)) return false;
    }
    if (endDate) {
      const pDate = p.date ? new Date(p.date) : null;
      if (pDate && pDate > new Date(endDate + 'T23:59:59')) return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const billNo = String(p.billNo || p._id || '').toLowerCase();
      const desc = String(p.description || p.itemName || '').toLowerCase();
      const vendorName = String(p.paidTo || p.vendorName || '').toLowerCase();
      const mode = String(p.paymentMode || '').toLowerCase();
      return billNo.includes(q) || desc.includes(q) || vendorName.includes(q) || mode.includes(q);
    }

    return true;
  });

  // Calculate Ledger Financial Summaries
  const totalBilled = filteredPurchases.reduce((sum, p) => sum + (Number(p.amount || p.totalAmount) || 0), 0);
  
  const totalPaid = filteredPurchases.reduce((sum, p) => {
    const totalAmt = Number(p.amount || p.totalAmount) || 0;
    const st = String(p.status || '').toUpperCase();
    if (st === 'APPROVED' || st === 'PAID') return sum + totalAmt;
    if (st === 'PARTIAL' || st === 'PARTIALLY_PAID') {
      return sum + Number(p.paidAmount || Math.round(totalAmt / 2));
    }
    return sum; // PENDING = 0 paid
  }, 0);

  const totalOutstandingDue = Math.max(0, totalBilled - totalPaid);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card & Supplier Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-200/60 dark:border-purple-800/60 shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Suppliers & Vendors Ledger Statement
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Track procurement bills, vendor payouts, and outstanding payables.
            </p>
          </div>
        </div>

        {/* Supplier Selector Dropdown */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Select Supplier:</label>
          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer min-w-[220px]"
          >
            <option value="ALL">-- All Suppliers / Vendors --</option>
            {vendors.map((v) => (
              <option key={v._id || v.id} value={v._id || v.id}>
                {v.name} {v.phone ? `(${v.phone})` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={fetchPurchaseLedger}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Refresh Supplier Ledger"
          >
            <RefreshCw size={16} className={loadingLedger ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Financial Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-purple-500/20 dark:border-purple-500/30 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Billed Procurement</p>
            <ShoppingCart size={18} className="text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
            ₹{totalBilled.toLocaleString('en-IN')}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Total Invoiced Procurement</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Amount Paid</p>
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            ₹{totalPaid.toLocaleString('en-IN')}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Paid Outflow</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-rose-500/20 dark:border-rose-500/30 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Outstanding Balance Due</p>
            <Wallet size={18} className="text-rose-600 dark:text-rose-400" />
          </div>
          <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 mt-2 font-mono">
            ₹{totalOutstandingDue.toLocaleString('en-IN')}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Payable Owed to Supplier</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-blue-500/20 dark:border-blue-500/30 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Procurement Bills</p>
            <FileText size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-black text-blue-600 dark:text-blue-400 mt-2 font-mono">
            {filteredPurchases.length}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Total Bill Entries</p>
        </div>
      </div>

      {/* Filter & Export Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Bill No, item name, vendor name, payment mode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>

        {/* Filters & Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Paid (Approved)</option>
              <option value="PARTIAL">Partially Paid</option>
              <option value="PENDING">Pending (Unpaid)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium cursor-pointer"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium cursor-pointer"
            />
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <Printer size={13} />
            <span>Print</span>
          </button>

          <ExcelExportButton
            data={filteredPurchases.map((p, idx) => ({
              'S.No': idx + 1,
              'Date': p.date ? new Date(p.date).toLocaleDateString('en-IN') : '',
              'Bill / PO No': p.billNo || p._id || '',
              'Supplier / Vendor': p.paidTo || p.vendorName || '',
              'Item / Description': p.description || p.itemName || '',
              'Payment Mode': p.paymentMode || '',
              'Status': p.status || '',
              'Billed Amount (₹)': Number(p.amount || p.totalAmount) || 0
            }))}
            fileName={`Suppliers_Ledger_${selectedVendor ? selectedVendor.name.replace(/\s+/g, '_') : 'All'}`}
            sheetName="SuppliersLedger"
            title="Export Excel"
          />
        </div>
      </div>

      {/* Supplier Purchase Ledger Transactions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {selectedVendor ? `${selectedVendor.name} - Purchase Ledger Register` : 'All Suppliers Ledger Register'}
          </h4>
          <span className="text-xs font-bold text-slate-400">
            Records: {filteredPurchases.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-y border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Bill / PO No.</th>
                <th className="py-2.5 px-3">Supplier Name</th>
                <th className="py-2.5 px-3">Item / Service Details</th>
                <th className="py-2.5 px-3">Payment Mode</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Billed Amt (₹)</th>
                <th className="py-2.5 px-3 text-right">Paid Amt (₹)</th>
                <th className="py-2.5 px-3 text-right">Balance Due (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loadingLedger ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <Loader2 size={20} className="animate-spin inline-block text-purple-600 mr-2" />
                    <span>Loading supplier ledger entries...</span>
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No purchase ledger entries found for the selected supplier and filters.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const billedAmt = Number(p.amount || p.totalAmount) || 0;
                  const st = String(p.status || '').toUpperCase();
                  let paidAmt = 0;
                  if (st === 'APPROVED' || st === 'PAID') {
                    paidAmt = billedAmt;
                  } else if (st === 'PARTIAL' || st === 'PARTIALLY_PAID') {
                    paidAmt = Number(p.paidAmount || Math.round(billedAmt / 2));
                  }
                  const balDue = Math.max(0, billedAmt - paidAmt);

                  return (
                    <tr key={p._id || p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition">
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {p.billNo || p._id || 'N/A'}
                      </td>
                      <td className="py-3 px-3 font-bold text-purple-600 dark:text-purple-400">
                        {p.paidTo || p.vendorName || 'Supplier'}
                      </td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-medium">
                        {p.description || p.itemName || 'Procurement'}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {p.paymentMode || 'Bank Transfer'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          st === 'APPROVED' || st === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : st === 'PARTIAL' || st === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {st === 'APPROVED' ? 'PAID' : (st === 'PARTIAL' ? 'PARTIAL' : (st === 'PENDING' ? 'UNPAID' : st))}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹{billedAmt.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{paidAmt.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                        ₹{balDue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuppliersLedgerTab;
