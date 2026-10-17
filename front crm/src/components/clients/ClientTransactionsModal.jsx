import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Eye, ArrowUpRight, ArrowDownLeft, ShoppingBag, FolderKanban, 
  Calendar, Clock, CheckCircle2, AlertCircle, Search, ExternalLink,
  DollarSign, Receipt, CreditCard, Building2, Phone, Mail, Loader2,
  TrendingUp, TrendingDown, Layers, FileText, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getClientTransactions } from '../../services/clientService';
import { useToast } from '../ToastProvider';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return String(dateStr);
  }
};

const ClientTransactionsModal = ({ isOpen, onClose, client }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'sales' | 'income' | 'purchases' | 'projects' | 'meetings'
  const [search, setSearch] = useState('');
  const [data, setData] = useState({
    summary: { totalSales: 0, totalIncome: 0, totalPurchases: 0, balanceDue: 0 },
    sales: [],
    incomes: [],
    purchases: [],
    projects: [],
    meetings: [],
    followups: []
  });

  const clientId = client?._id || client?.id || client?.clientId;

  useEffect(() => {
    if (!isOpen || !clientId) return;
    loadTransactions();
  }, [isOpen, clientId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await getClientTransactions(clientId);
      if (res && res.success && res.data) {
        setData(res.data);
      } else {
        // Fallback: populate basic info if API returned partial data
        setData(prev => ({
          ...prev,
          summary: res?.data?.summary || prev.summary,
          sales: res?.data?.sales || [],
          incomes: res?.data?.incomes || [],
          purchases: res?.data?.purchases || [],
          projects: res?.data?.projects || [],
          meetings: res?.data?.meetings || [],
          followups: res?.data?.followups || []
        }));
      }
    } catch (err) {
      console.error('Failed to load client ledger:', err);
      showToast('Error loading client ledger transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Compile unified feed of all events
  const allActivities = useMemo(() => {
    const list = [];

    // Sales
    (data.sales || []).forEach(s => {
      list.push({
        id: `sale-${s._id}`,
        type: 'Sale',
        title: s.title || `Invoice ${s.invoiceNumber}`,
        subtitle: `Ref #${s.invoiceNumber}`,
        amount: s.totalAmount,
        date: s.date,
        status: s.status,
        statusColor: s.status === 'Paid' ? 'emerald' : (s.status === 'Pending' ? 'amber' : 'indigo'),
        icon: ArrowUpRight,
        iconColor: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20',
        meta: s.taxOption ? `Tax: ${s.taxOption}` : ''
      });
    });

    // Incomes (Payments received)
    (data.incomes || []).forEach(inc => {
      list.push({
        id: `income-${inc._id}`,
        type: 'Income',
        title: `Payment Received #${inc.receiptNo}`,
        subtitle: `Via ${inc.paymentMethod} (Inv: ${inc.invoiceNumber})`,
        amount: inc.amount,
        date: inc.date,
        status: 'Settled',
        statusColor: 'emerald',
        icon: ArrowDownLeft,
        iconColor: 'text-[#c5a878] bg-[#c5a878]/15 dark:bg-[#c5a878]/20',
        meta: inc.notes
      });
    });

    // Purchases
    (data.purchases || []).forEach(p => {
      list.push({
        id: `purchase-${p._id}`,
        type: 'Purchase',
        title: p.title || 'Purchase Order',
        subtitle: `Paid to: ${p.paidTo} (${p.category || 'Direct'})`,
        amount: p.amount,
        date: p.date,
        status: p.status || 'Approved',
        statusColor: 'rose',
        icon: ShoppingBag,
        iconColor: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20',
        meta: `Mode: ${p.paymentMode}`
      });
    });

    // Projects
    (data.projects || []).forEach(prj => {
      list.push({
        id: `project-${prj._id}`,
        type: 'Project',
        title: prj.title || prj.projectName || 'Client Project',
        subtitle: `Budget: ${formatCurrency(prj.budget || 0)}`,
        amount: prj.budget || 0,
        date: prj.startDate || prj.createdAt,
        status: prj.status || 'Active',
        statusColor: 'indigo',
        icon: FolderKanban,
        iconColor: 'text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20',
        meta: `Team: ${prj.projectManager?.name || 'Assigned'}`
      });
    });

    // Meetings
    (data.meetings || []).forEach(m => {
      list.push({
        id: `meeting-${m._id}`,
        type: 'Meeting',
        title: m.title || 'Client Consultation',
        subtitle: `${m.time || '10:00 AM'} (${m.type || 'In-Person'})`,
        amount: null,
        date: m.date,
        status: m.status || 'Scheduled',
        statusColor: 'sky',
        icon: Calendar,
        iconColor: 'text-sky-500 bg-sky-500/10 dark:bg-sky-500/20',
        meta: m.notes
      });
    });

    // Sort by date descending
    list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return list;
  }, [data]);

  // Filter based on search query
  const filteredActivities = useMemo(() => {
    let result = allActivities;

    if (activeTab === 'sales') {
      result = allActivities.filter(a => a.type === 'Sale');
    } else if (activeTab === 'income') {
      result = allActivities.filter(a => a.type === 'Income');
    } else if (activeTab === 'purchases') {
      result = allActivities.filter(a => a.type === 'Purchase');
    } else if (activeTab === 'projects') {
      result = allActivities.filter(a => a.type === 'Project');
    } else if (activeTab === 'meetings') {
      result = allActivities.filter(a => a.type === 'Meeting');
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(item => 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        (item.type && item.type.toLowerCase().includes(q)) ||
        (item.status && item.status.toLowerCase().includes(q)) ||
        (item.meta && item.meta.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allActivities, activeTab, search]);

  if (!isOpen) return null;

  const clientName = client?.clientName || client?.companyName || 'Client';
  const companyName = client?.companyName !== client?.clientName ? client?.companyName : '';
  const phone = client?.phone || '';
  const email = client?.email || '';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0c1810] border border-slate-200 dark:border-[#c5a878]/25 rounded-3xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#142217]/50 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1b3d27] to-[#245233] text-[#c5a878] border border-[#c5a878]/30 font-black text-lg flex items-center justify-center shrink-0 shadow-md">
              {clientName[0]?.toUpperCase() || 'C'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                  {clientName}
                </h2>
                {client?.clientId && (
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {client.clientId}
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {client?.status || 'Active'}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                {companyName && (
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                    <Building2 size={13} className="text-[#c5a878]" /> {companyName}
                  </span>
                )}
                {phone && (
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Phone size={13} className="text-slate-400" /> {phone}
                  </span>
                )}
                {email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail size={13} className="text-slate-400" /> {email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/clients/${clientId}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
              title="Open Full Client Dossier"
            >
              <span>Full Dossier</span>
              <ExternalLink size={13} />
            </Link>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-100/50 dark:bg-[#0c1810]/70 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
          {/* Total Sales */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#142217]/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Sales (Billed)</span>
              <ArrowUpRight size={16} className="text-emerald-500" />
            </div>
            <p className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(data.summary?.totalSales || 0)}
            </p>
            <span className="text-[10px] font-semibold text-slate-400">
              {(data.sales || []).length} Invoices / Orders
            </span>
          </div>

          {/* Income Received */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#142217]/80 border border-slate-200/80 dark:border-[#c5a878]/30 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Income Received</span>
              <ArrowDownLeft size={16} className="text-[#c5a878]" />
            </div>
            <p className="text-base sm:text-xl font-black text-[#b8955e] dark:text-[#c5a878]">
              {formatCurrency(data.summary?.totalIncome || 0)}
            </p>
            <span className="text-[10px] font-semibold text-slate-400">
              {(data.incomes || []).length} Payments Settled
            </span>
          </div>

          {/* Balance Due */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#142217]/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Outstanding Balance</span>
              <AlertCircle size={16} className="text-amber-500" />
            </div>
            <p className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400">
              {formatCurrency(data.summary?.balanceDue || 0)}
            </p>
            <span className="text-[10px] font-semibold text-slate-400">
              Pending Collection
            </span>
          </div>

          {/* Purchases / Expenses */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#142217]/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Purchases & Expenses</span>
              <ShoppingBag size={16} className="text-rose-500" />
            </div>
            <p className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(data.summary?.totalPurchases || 0)}
            </p>
            <span className="text-[10px] font-semibold text-slate-400">
              {(data.purchases || []).length} Expense Line Items
            </span>
          </div>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Scrollable Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {[
              { id: 'all', label: 'All Activity', count: allActivities.length },
              { id: 'sales', label: 'Sales / Invoices', count: (data.sales || []).length },
              { id: 'income', label: 'Income Receipts', count: (data.incomes || []).length },
              { id: 'purchases', label: 'Purchases', count: (data.purchases || []).length },
              { id: 'projects', label: 'Projects', count: (data.projects || []).length },
              { id: 'meetings', label: 'Meetings', count: (data.meetings || []).length }
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#1b3d27] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search inside transactions */}
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in records..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Modal Body / Transaction List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-[#c5a878]" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Retrieving client records & transactions...
              </p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No records recorded in this category
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No transactions, invoices, or records currently match your search criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredActivities.map((item) => {
                const IconComponent = item.icon || Activity;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#142217]/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-[#c5a878]/40 transition-all flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconColor}`}>
                        <IconComponent size={18} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                            {item.title}
                          </h4>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-md ${
                            item.type === 'Sale' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                            item.type === 'Income' ? 'bg-[#c5a878]/15 text-[#b8955e] dark:text-[#c5a878] border border-[#c5a878]/30' :
                            item.type === 'Purchase' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
                            'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {item.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                          <span>{item.subtitle}</span>
                          {item.meta && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]">{item.meta}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Clock size={11} /> {formatDate(item.date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {item.amount !== null && item.amount !== undefined ? (
                        <p className={`font-black text-xs sm:text-base ${
                          item.type === 'Sale' ? 'text-emerald-600 dark:text-emerald-400' :
                          item.type === 'Income' ? 'text-[#b8955e] dark:text-[#c5a878]' :
                          item.type === 'Purchase' ? 'text-rose-600 dark:text-rose-400' :
                          'text-slate-800 dark:text-slate-200'
                        }`}>
                          {item.type === 'Purchase' ? '-' : '+'}{formatCurrency(item.amount)}
                        </p>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">—</span>
                      )}

                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        item.status === 'Paid' || item.status === 'Settled' || item.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        item.status === 'Pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        item.status === 'Proforma' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#142217]/50 flex items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total records: <strong className="text-slate-800 dark:text-slate-200">{filteredActivities.length}</strong>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/clients/${clientId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <span>View Full Details & Documents</span>
              <ChevronRight size={14} />
            </Link>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#1b3d27] hover:bg-[#234e32] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default ClientTransactionsModal;
