import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  TrendingUp, 
  ArrowDownRight, 
  Wallet, 
  Plus, 
  Trash2, 
  Search, 
  RefreshCw, 
  Filter, 
  Printer, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  Building2, 
  ArrowRight,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Receipt
} from 'lucide-react';
import { useToast } from '../ToastProvider';
import { 
  getPartnerShareSummary, 
  createPartnerDrawing, 
  deletePartnerDrawing 
} from '../../services/accountsService';
import ConfirmModal from '../ConfirmModal';
import ExcelExportButton from '../ExcelExportButton';

const formatINR = (val) => {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const formatDateDetails = (dateStr) => {
  if (!dateStr) return { formatted: '-', weekday: '', iso: '-' };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { formatted: dateStr, weekday: '', iso: dateStr };
    const formatted = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const iso = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    return { formatted, weekday, iso };
  } catch {
    return { formatted: dateStr, weekday: '', iso: dateStr };
  }
};

const ShareTab = () => {
  const { showToast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: {
      totalJobs: 0,
      totalQuotationRevenue: 0,
      totalDirectCosts: 0,
      totalNetWorkProfit: 0,
      totalAmountReceived: 0,
      owner1: { partner: 'Owner 1', name: 'Owner 1', splitPercentage: 50, grossShare: 0, totalWithdrawn: 0, netBalance: 0 },
      owner2: { partner: 'Owner 2', name: 'Owner 2', splitPercentage: 50, grossShare: 0, totalWithdrawn: 0, netBalance: 0 }
    },
    jobs: [],
    drawings: []
  });

  // Partner custom display names (stored in localStorage)
  const [partnerNames, setPartnerNames] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_partner_names');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { owner1: 'Owner 1', owner2: 'Owner 2' };
  });

  // Table searches
  const [searchOwner1, setSearchOwner1] = useState('');
  const [searchOwner2, setSearchOwner2] = useState('');
  const [showWorkOrders, setShowWorkOrders] = useState(false);

  // Modal states
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [savingDrawing, setSavingDrawing] = useState(false);

  // Form state for Record Drawing
  const [drawingForm, setDrawingForm] = useState({
    partner: 'Owner 1',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'Bank Transfer',
    reason: '',
    referenceNo: '',
    notes: ''
  });

  // Confirm delete modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Load Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPartnerShareSummary();
      if (res && res.success) {
        setData(res);
      } else if (res && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load partner share summary:', err);
      showToast('Error loading partner share data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save Partner Names
  const handleSavePartnerNames = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('crm_partner_names', JSON.stringify(partnerNames));
      showToast('Partner names updated successfully!', 'success');
      setIsSettingsModalOpen(false);
    } catch (err) {
      showToast('Failed to save partner names.', 'error');
    }
  };

  // Open Drawing Modal
  const openRecordDrawingModal = (defaultPartner = 'Owner 1') => {
    setDrawingForm({
      partner: defaultPartner,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMode: 'Bank Transfer',
      reason: '',
      referenceNo: '',
      notes: ''
    });
    setIsDrawingModalOpen(true);
  };

  // Submit Drawing
  const handleSaveDrawing = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(drawingForm.amount);
    if (!amountNum || amountNum <= 0) {
      showToast('Please enter a valid withdrawal amount.', 'warning');
      return;
    }

    setSavingDrawing(true);
    try {
      const partnerDisplayName = drawingForm.partner === 'Owner 1' ? partnerNames.owner1 : partnerNames.owner2;
      const res = await createPartnerDrawing({
        partner: drawingForm.partner,
        partnerName: partnerDisplayName,
        amount: amountNum,
        date: drawingForm.date,
        paymentMode: drawingForm.paymentMode,
        reason: drawingForm.reason || 'Partner Profit Withdrawal',
        referenceNo: drawingForm.referenceNo,
        notes: drawingForm.notes
      });

      if (res && (res.success || res.data)) {
        showToast(`Withdrawal of ${formatINR(amountNum)} recorded for ${partnerDisplayName}.`, 'success');
        setIsDrawingModalOpen(false);
        fetchData();
      } else {
        showToast(res?.message || 'Failed to record drawing.', 'error');
      }
    } catch (err) {
      console.error('Error saving partner drawing:', err);
      showToast(err.response?.data?.message || 'Error recording drawing.', 'error');
    } finally {
      setSavingDrawing(false);
    }
  };

  // Delete Drawing
  const handleDeleteDrawing = (drawing) => {
    const partnerLabel = drawing.partner === 'Owner 1' ? partnerNames.owner1 : partnerNames.owner2;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Owner Withdrawal Record',
      message: `Are you sure you want to delete this withdrawal of ${formatINR(drawing.amount)} dated ${formatDateDetails(drawing.date).formatted} for ${partnerLabel}? This will restore the deducted amount to their balance.`,
      onConfirm: async () => {
        try {
          const res = await deletePartnerDrawing(drawing._id);
          if (res && res.success) {
            showToast('Withdrawal record deleted successfully.', 'success');
            fetchData();
          } else {
            showToast(res?.message || 'Failed to delete record.', 'error');
          }
        } catch (err) {
          console.error('Error deleting drawing:', err);
          showToast(err.response?.data?.message || 'Error deleting record.', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 50/50 Split Calculations based on RECEIVED AMOUNT
  const totalAmountReceived = Number(data.summary?.totalAmountReceived || 0);
  const halfReceivedShare = totalAmountReceived / 2;

  // Split Drawings by Owner
  const rawOwner1Drawings = useMemo(() => {
    return (data.drawings || []).filter(d => d.partner === 'Owner 1');
  }, [data.drawings]);

  const rawOwner2Drawings = useMemo(() => {
    return (data.drawings || []).filter(d => d.partner === 'Owner 2');
  }, [data.drawings]);

  // Filtered lists for Owner 1 and Owner 2 tables
  const owner1Drawings = useMemo(() => {
    let list = [...rawOwner1Drawings];
    if (searchOwner1.trim()) {
      const q = searchOwner1.toLowerCase();
      list = list.filter(d => 
        (d.drawingId && d.drawingId.toLowerCase().includes(q)) ||
        (d.reason && d.reason.toLowerCase().includes(q)) ||
        (d.paymentMode && d.paymentMode.toLowerCase().includes(q)) ||
        (d.date && String(d.date).toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return list;
  }, [rawOwner1Drawings, searchOwner1]);

  const owner2Drawings = useMemo(() => {
    let list = [...rawOwner2Drawings];
    if (searchOwner2.trim()) {
      const q = searchOwner2.toLowerCase();
      list = list.filter(d => 
        (d.drawingId && d.drawingId.toLowerCase().includes(q)) ||
        (d.reason && d.reason.toLowerCase().includes(q)) ||
        (d.paymentMode && d.paymentMode.toLowerCase().includes(q)) ||
        (d.date && String(d.date).toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return list;
  }, [rawOwner2Drawings, searchOwner2]);

  // Aggregate stats per owner
  const totalOwner1Withdrawn = rawOwner1Drawings.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalOwner2Withdrawn = rawOwner2Drawings.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const netOwner1Balance = halfReceivedShare - totalOwner1Withdrawn;
  const netOwner2Balance = halfReceivedShare - totalOwner2Withdrawn;

  // Excel export lists
  const excelOwner1Data = useMemo(() => {
    return owner1Drawings.map(d => ({
      'Date': formatDateDetails(d.date).formatted,
      'Voucher #': d.drawingId || '-',
      'Partner': partnerNames.owner1,
      'Withdrawn Amount (INR)': d.amount,
      'Payment Mode': d.paymentMode,
      'Reason': d.reason,
      'Recorded By': d.recordedBy || 'Admin'
    }));
  }, [owner1Drawings, partnerNames.owner1]);

  const excelOwner2Data = useMemo(() => {
    return owner2Drawings.map(d => ({
      'Date': formatDateDetails(d.date).formatted,
      'Voucher #': d.drawingId || '-',
      'Partner': partnerNames.owner2,
      'Withdrawn Amount (INR)': d.amount,
      'Payment Mode': d.paymentMode,
      'Reason': d.reason,
      'Recorded By': d.recordedBy || 'Admin'
    }));
  }, [owner2Drawings, partnerNames.owner2]);

  return (
    <div className="space-y-4">
      {/* ── Global Header & Summary Bar ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Partner Accounts & Withdrawals
              <span className="text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                50 / 50 Received Cash Split
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total received money from client work orders divided equally between two owners, minus individual withdrawals by date
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Summary Chips */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs">
            <span className="text-slate-500">Total Received:</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatINR(totalAmountReceived)}</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-slate-500">50% Each:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatINR(halfReceivedShare)}</span>
          </div>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Configure Partner Names"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Partner Names</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Print Partner Statement"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={() => openRecordDrawingModal('Owner 1')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Withdrawal</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          TWO OWNER TABLES GRID (SIDE-BY-SIDE ON DESKTOP, STACKED ON MOBILE)
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* ══════════════════════════════════════════════════════════════════════════
            TABLE 1: OWNER 1 WITHDRAWALS & ACCOUNT
        ══════════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">
          {/* Owner 1 Header Card */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/40 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-100 dark:border-indigo-900/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{partnerNames.owner1}</span>
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-900/60 px-2 py-0.5 rounded-md">
                    50% Share
                  </span>
                </h3>
              </div>

              <button
                onClick={() => openRecordDrawingModal('Owner 1')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Withdraw</span>
              </button>
            </div>

            {/* KPI Metrics Strip */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">50% Received</span>
                <span className="font-bold text-slate-900 dark:text-white text-xs">{formatINR(halfReceivedShare)}</span>
              </div>
              <div className="bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Withdrawn</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-xs">- {formatINR(totalOwner1Withdrawn)}</span>
              </div>
              <div className="bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Retained Balance</span>
                <span className={`font-black text-xs ${netOwner1Balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatINR(netOwner1Balance)}
                </span>
              </div>
            </div>

            {/* Search and Count Bar */}
            <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-indigo-100/60 dark:border-indigo-900/40">
              <span className="text-[11px] font-semibold text-slate-500">
                {owner1Drawings.length} {owner1Drawings.length === 1 ? 'Withdrawal' : 'Withdrawals'} Recorded
              </span>
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchOwner1}
                    onChange={(e) => setSearchOwner1(e.target.value)}
                    placeholder="Search date, voucher..."
                    className="pl-6 pr-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none w-36"
                  />
                  {searchOwner1 && (
                    <button onClick={() => setSearchOwner1('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                <ExcelExportButton
                  data={excelOwner1Data}
                  filename={`${partnerNames.owner1}_Withdrawals`}
                  sheetName="Withdrawals"
                  buttonText="Excel"
                  className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Owner 1 Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-2.5">Voucher #</th>
                  <th className="py-2 px-2.5 text-right">Amount (₹)</th>
                  <th className="py-2 px-2.5">Mode</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-500" />
                      Loading withdrawals...
                    </td>
                  </tr>
                ) : owner1Drawings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-1.5 text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <p className="font-semibold text-slate-600 dark:text-slate-400 text-xs">
                        No withdrawals for {partnerNames.owner1}
                      </p>
                      <button
                        onClick={() => openRecordDrawingModal('Owner 1')}
                        className="mt-1 text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        + Record First Withdrawal
                      </button>
                    </td>
                  </tr>
                ) : (
                  owner1Drawings.map((drw) => {
                    const dateDetails = formatDateDetails(drw.date);
                    return (
                      <tr key={drw._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Date */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block text-xs">
                                {dateDetails.formatted}
                              </span>
                              <span className="text-[10px] text-slate-400 block -mt-0.5">
                                {dateDetails.weekday}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Voucher # */}
                        <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {drw.drawingId || '-'}
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-2.5 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap text-xs">
                          - {formatINR(drw.amount)}
                        </td>

                        {/* Payment Mode */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {drw.paymentMode || 'Bank Transfer'}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="py-2.5 px-3 max-w-[130px] truncate text-[11px]" title={drw.reason}>
                          {drw.reason || 'Partner Profit Withdrawal'}
                        </td>

                        {/* Action */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteDrawing(drw)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Delete this withdrawal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {owner1Drawings.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold text-xs text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700">
                    <td colSpan={2} className="py-2.5 px-3 uppercase text-[10px] tracking-wider text-slate-500">
                      Total Deducted
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-rose-600 dark:text-rose-400 font-black">
                      - {formatINR(totalOwner1Withdrawn)}
                    </td>
                    <td colSpan={3} className="py-2.5 px-2 text-right pr-3">
                      <span className="text-[10px] text-slate-400 mr-1.5 font-normal">Balance:</span>
                      <span className={netOwner1Balance >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                        {formatINR(netOwner1Balance)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            TABLE 2: OWNER 2 WITHDRAWALS & ACCOUNT
        ══════════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">
          {/* Owner 2 Header Card */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-purple-50/40 dark:bg-purple-950/20">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-100 dark:border-purple-900/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{partnerNames.owner2}</span>
                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-100/70 dark:bg-purple-900/60 px-2 py-0.5 rounded-md">
                    50% Share
                  </span>
                </h3>
              </div>

              <button
                onClick={() => openRecordDrawingModal('Owner 2')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Withdraw</span>
              </button>
            </div>

            {/* KPI Metrics Strip */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">50% Received</span>
                <span className="font-bold text-slate-900 dark:text-white text-xs">{formatINR(halfReceivedShare)}</span>
              </div>
              <div className="bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Withdrawn</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-xs">- {formatINR(totalOwner2Withdrawn)}</span>
              </div>
              <div className="bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Retained Balance</span>
                <span className={`font-black text-xs ${netOwner2Balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatINR(netOwner2Balance)}
                </span>
              </div>
            </div>

            {/* Search and Count Bar */}
            <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-purple-100/60 dark:border-purple-900/40">
              <span className="text-[11px] font-semibold text-slate-500">
                {owner2Drawings.length} {owner2Drawings.length === 1 ? 'Withdrawal' : 'Withdrawals'} Recorded
              </span>
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchOwner2}
                    onChange={(e) => setSearchOwner2(e.target.value)}
                    placeholder="Search date, voucher..."
                    className="pl-6 pr-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none w-36"
                  />
                  {searchOwner2 && (
                    <button onClick={() => setSearchOwner2('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                <ExcelExportButton
                  data={excelOwner2Data}
                  filename={`${partnerNames.owner2}_Withdrawals`}
                  sheetName="Withdrawals"
                  buttonText="Excel"
                  className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Owner 2 Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-2.5">Voucher #</th>
                  <th className="py-2 px-2.5 text-right">Amount (₹)</th>
                  <th className="py-2 px-2.5">Mode</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-purple-500" />
                      Loading withdrawals...
                    </td>
                  </tr>
                ) : owner2Drawings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-1.5 text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <p className="font-semibold text-slate-600 dark:text-slate-400 text-xs">
                        No withdrawals for {partnerNames.owner2}
                      </p>
                      <button
                        onClick={() => openRecordDrawingModal('Owner 2')}
                        className="mt-1 text-[11px] font-semibold text-purple-600 hover:underline cursor-pointer"
                      >
                        + Record First Withdrawal
                      </button>
                    </td>
                  </tr>
                ) : (
                  owner2Drawings.map((drw) => {
                    const dateDetails = formatDateDetails(drw.date);
                    return (
                      <tr key={drw._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Date */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block text-xs">
                                {dateDetails.formatted}
                              </span>
                              <span className="text-[10px] text-slate-400 block -mt-0.5">
                                {dateDetails.weekday}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Voucher # */}
                        <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {drw.drawingId || '-'}
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-2.5 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap text-xs">
                          - {formatINR(drw.amount)}
                        </td>

                        {/* Payment Mode */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {drw.paymentMode || 'Bank Transfer'}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="py-2.5 px-3 max-w-[130px] truncate text-[11px]" title={drw.reason}>
                          {drw.reason || 'Partner Profit Withdrawal'}
                        </td>

                        {/* Action */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteDrawing(drw)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Delete this withdrawal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {owner2Drawings.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold text-xs text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700">
                    <td colSpan={2} className="py-2.5 px-3 uppercase text-[10px] tracking-wider text-slate-500">
                      Total Deducted
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-rose-600 dark:text-rose-400 font-black">
                      - {formatINR(totalOwner2Withdrawn)}
                    </td>
                    <td colSpan={3} className="py-2.5 px-2 text-right pr-3">
                      <span className="text-[10px] text-slate-400 mr-1.5 font-normal">Balance:</span>
                      <span className={netOwner2Balance >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                        {formatINR(netOwner2Balance)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          COLLAPSIBLE: FABRICATION WORK ORDERS (RECEIVED AMOUNT REVENUE SOURCE)
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <button
          onClick={() => setShowWorkOrders(!showWorkOrders)}
          className="w-full p-3.5 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Work Orders & Received Cash Source ({data.jobs?.length || 0} Jobs)
              </span>
              <span className="text-[11px] text-slate-500">
                Revenue, direct costs, and amount collected from clients forming the ₹{totalAmountReceived.toLocaleString('en-IN')} cash pool
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>{showWorkOrders ? 'Hide Details' : 'View Work Orders'}</span>
            {showWorkOrders ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showWorkOrders && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 overflow-x-auto animate-in fade-in duration-150">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 px-3">Job ID</th>
                  <th className="py-2 px-3">Client</th>
                  <th className="py-2 px-3">Scope</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Quoted (₹)</th>
                  <th className="py-2 px-3 text-right">Direct Costs (₹)</th>
                  <th className="py-2 px-3 text-right font-bold text-emerald-600">Received Cash (₹)</th>
                  <th className="py-2 px-3 text-right">Balance Due (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {data.jobs?.map((job) => (
                  <tr key={job._id || job.jobId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">{job.jobId}</td>
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">{job.clientName}</td>
                    <td className="py-2 px-3 max-w-xs truncate">{job.workDescription || '-'}</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
                        {job.status ? job.status.replace(/_/g, ' ') : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">{formatINR(job.quotationRevenue)}</td>
                    <td className="py-2 px-3 text-right text-slate-500">{formatINR(job.directCosts)}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(job.amountReceived)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">{formatINR(job.balanceDue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700">
                  <td colSpan={4} className="py-2.5 px-3 uppercase text-[10px] text-slate-500">
                    Total Revenue & Received Cash Pool
                  </td>
                  <td className="py-2.5 px-3 text-right">{formatINR(data.summary?.totalQuotationRevenue)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-500">{formatINR(data.summary?.totalDirectCosts)}</td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-600 text-sm">
                    {formatINR(totalAmountReceived)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Record Drawing Modal ── */}
      {isDrawingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Record Owner Withdrawal / Deduction
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Deduct money from the selected partner&apos;s 50% received share
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDrawing} className="p-4 space-y-3.5 text-xs">
              {/* Partner Select */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Select Partner / Owner <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDrawingForm(prev => ({ ...prev, partner: 'Owner 1' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      drawingForm.partner === 'Owner 1'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="block text-xs">{partnerNames.owner1}</span>
                    <span className="block text-[10px] text-slate-500 font-normal">
                      Available: {formatINR(netOwner1Balance)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawingForm(prev => ({ ...prev, partner: 'Owner 2' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      drawingForm.partner === 'Owner 2'
                        ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="block text-xs">{partnerNames.owner2}</span>
                    <span className="block text-[10px] text-slate-500 font-normal">
                      Available: {formatINR(netOwner2Balance)}
                    </span>
                  </button>
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Withdrawal Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={drawingForm.amount}
                    onChange={(e) => setDrawingForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="e.g. 1500"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Withdrawal Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={drawingForm.date}
                    onChange={(e) => setDrawingForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Payment Mode & Ref */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={drawingForm.paymentMode}
                    onChange={(e) => setDrawingForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Txn / Ref No.
                  </label>
                  <input
                    type="text"
                    value={drawingForm.referenceNo}
                    onChange={(e) => setDrawingForm(prev => ({ ...prev, referenceNo: e.target.value }))}
                    placeholder="e.g. UTR / Chq #..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Reason / Purpose */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Reason / Purpose
                </label>
                <input
                  type="text"
                  value={drawingForm.reason}
                  onChange={(e) => setDrawingForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Personal Drawing, Advance..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Balance Simulation Alert */}
              {drawingForm.amount && parseFloat(drawingForm.amount) > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Projected Balance After Deduction:</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {formatINR(
                      (drawingForm.partner === 'Owner 1' ? netOwner1Balance : netOwner2Balance) - parseFloat(drawingForm.amount)
                    )}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDrawingModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDrawing}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {savingDrawing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Withdrawal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Partner Names Configuration Modal ── */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                Customize Partner Names
              </h3>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePartnerNames} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Partner 1 Name (50% Allocation)
                </label>
                <input
                  type="text"
                  required
                  value={partnerNames.owner1}
                  onChange={(e) => setPartnerNames(prev => ({ ...prev, owner1: e.target.value }))}
                  placeholder="e.g. Partner A / Founder"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Partner 2 Name (50% Allocation)
                </label>
                <input
                  type="text"
                  required
                  value={partnerNames.owner2}
                  onChange={(e) => setPartnerNames(prev => ({ ...prev, owner2: e.target.value }))}
                  placeholder="e.g. Partner B / Co-Founder"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
                >
                  Save Names
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Printable Partner Statement Modal ── */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 my-8">
            {/* Print Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  PARTNER RECEIVED AMOUNT & WITHDRAWALS STATEMENT
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  50/50 Client Received Cash Division & Itemized Owner Deductions
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Statement Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  50 / 50 Equal Cash Split
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Total Jobs: {data.jobs?.length || 0} | Total Withdrawals: {data.drawings?.length || 0}
                </div>
              </div>
            </div>

            {/* Enterprise Cash Pool Summary */}
            <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">Total Quoted Value:</span>
                <span className="font-bold text-slate-900 text-sm">{formatINR(data.summary?.totalQuotationRevenue || 0)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Direct Costs:</span>
                <span className="font-bold text-slate-900 text-sm">{formatINR(data.summary?.totalDirectCosts || 0)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Received Cash (∑):</span>
                <span className="font-bold text-emerald-600 text-sm">{formatINR(totalAmountReceived)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Each Partner 50%:</span>
                <span className="font-bold text-indigo-600 text-sm">{formatINR(halfReceivedShare)}</span>
              </div>
            </div>

            {/* Partner Statements Dual Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 border rounded-xl bg-slate-50/50 space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-sm pb-1 border-b">
                  {partnerNames.owner1} (50% Share)
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">50% Received Base:</span>
                  <span className="font-semibold">{formatINR(halfReceivedShare)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Total Deductions:</span>
                  <span className="font-semibold">- {formatINR(totalOwner1Withdrawn)}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-bold text-sm">
                  <span>Net Retained Balance:</span>
                  <span className={netOwner1Balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatINR(netOwner1Balance)}
                  </span>
                </div>
              </div>

              <div className="p-3.5 border rounded-xl bg-slate-50/50 space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-sm pb-1 border-b">
                  {partnerNames.owner2} (50% Share)
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">50% Received Base:</span>
                  <span className="font-semibold">{formatINR(halfReceivedShare)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Total Deductions:</span>
                  <span className="font-semibold">- {formatINR(totalOwner2Withdrawn)}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-bold text-sm">
                  <span>Net Retained Balance:</span>
                  <span className={netOwner2Balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatINR(netOwner2Balance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Withdrawals List in Statement */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Itemized Withdrawals ({data.drawings?.length || 0} Records)
              </h4>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 font-semibold text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Partner</th>
                      <th className="p-2">Voucher #</th>
                      <th className="p-2 text-right">Amount (₹)</th>
                      <th className="p-2">Mode</th>
                      <th className="p-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {data.drawings?.length === 0 ? (
                      <tr><td colSpan={6} className="p-3 text-center text-slate-400">No withdrawals recorded.</td></tr>
                    ) : (
                      data.drawings?.map((d) => (
                        <tr key={d._id}>
                          <td className="p-2 font-medium">{formatDateDetails(d.date).formatted}</td>
                          <td className="p-2 font-semibold">{d.partner === 'Owner 1' ? partnerNames.owner1 : partnerNames.owner2}</td>
                          <td className="p-2 font-mono text-slate-500">{d.drawingId || '-'}</td>
                          <td className="p-2 text-right font-bold text-rose-600">- {formatINR(d.amount)}</td>
                          <td className="p-2">{d.paymentMode}</td>
                          <td className="p-2 truncate max-w-xs">{d.reason}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-6 grid grid-cols-2 gap-8 border-t text-xs text-slate-600">
              <div className="text-center pt-8 border-t border-dashed border-slate-300">
                <p className="font-bold text-slate-900">{partnerNames.owner1}</p>
                <p className="text-[11px] text-slate-400">Partner / Owner Signature</p>
              </div>
              <div className="text-center pt-8 border-t border-dashed border-slate-300">
                <p className="font-bold text-slate-900">{partnerNames.owner2}</p>
                <p className="text-[11px] text-slate-400">Partner / Owner Signature</p>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Statement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete Withdrawal"
        type="danger"
      />
    </div>
  );
};

export default ShareTab;
