import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Package, 
  X, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  Loader2, 
  Phone,
  Tag,
  ArrowRight
} from 'lucide-react';
import { 
  getVendors, 
  createVendor, 
  updateVendor, 
  deleteVendor 
} from '../../services/accountsService';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';

export const DEFAULT_DESCRIPTIONS = [
  'MS Square Pipe 2x2 inch (16 gauge)',
  'MS Round Pipe 1.5 inch',
  'CR Sheet 1.2mm (8x4 ft)',
  'HR Sheet 2mm (8x4 ft)',
  'MS Flat 50x6 mm',
  'MS Angle 40x40x5 mm',
  'Welding Electrodes 6013 (ESAB / Advani)',
  'Cutting Wheels 4 inch & 14 inch',
  'Grinding Wheels 4 inch',
  'Industrial Oxygen Cylinder Refill',
  'Industrial CO2 / Argon Gas Cylinder Refill',
  'Fasteners & Anchor Bolts (10mm/12mm)',
  'Red Oxide Primer (20 Litres)',
  'Epoxy Primer & Thinner',
  'Crane & Loading Charges'
];

export const DEFAULT_VENDORS = [
  { name: 'Jindal Steel Distributors', phone: '9845012345', notes: 'Raw steel & pipes' },
  { name: 'Tata Steel Yard', phone: '9845067890', notes: 'Plates & sheets' },
  { name: 'Krishna Steels & Hardware', phone: '9845054321', notes: 'Structural MS & hardware' },
  { name: 'National Industrial Gas Agency', phone: '9845098765', notes: 'Oxygen & CO2 cylinders' },
  { name: 'Sai Welding Consumables & Tools', phone: '9845011223', notes: 'Welding rods & cutting wheels' },
  { name: 'Bhavani Paints & Coatings', phone: '9845033445', notes: 'Red oxide primer & thinners' }
];

const LOCAL_STORAGE_DESCS_KEY = 'crm_fab_item_descriptions';
const LOCAL_STORAGE_VENDORS_KEY = 'crm_fab_vendors_cache';

const DescriptionVendorModal = ({
  isOpen,
  onClose,
  initialTab = 'descriptions',
  initialDescription = '',
  initialVendor = '',
  onSelect
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab); // 'descriptions' | 'vendors'
  const [searchQuery, setSearchQuery] = useState('');

  // ── DESCRIPTIONS STATE ──
  const [descriptions, setDescriptions] = useState([]);
  const [newDesc, setNewDesc] = useState('');
  const [editingDescIdx, setEditingDescIdx] = useState(null);
  const [editingDescText, setEditingDescText] = useState('');

  // ── VENDORS STATE ──
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({ name: '', phone: '', notes: '' });
  const [addingVendor, setAddingVendor] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [editingVendorForm, setEditingVendorForm] = useState({ name: '', phone: '', notes: '' });

  // ── DELETE CONFIRMATION ──
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    type: '', // 'description' | 'vendor'
    item: null
  });

  // Load descriptions and vendors on open
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      loadDescriptions();
      loadVendors();
    }
  }, [isOpen, initialTab]);

  // 1. Descriptions Loader
  const loadDescriptions = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_DESCS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDescriptions(parsed);
          return;
        }
      }
    } catch (e) {}
    setDescriptions(DEFAULT_DESCRIPTIONS);
    persistDescriptions(DEFAULT_DESCRIPTIONS);
  };

  const persistDescriptions = (list) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_DESCS_KEY, JSON.stringify(list));
    } catch (e) {}
  };

  // 2. Vendors Loader
  const loadVendors = async () => {
    setLoadingVendors(true);
    let loaded = [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_VENDORS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loaded = parsed;
        }
      }
    } catch (e) {}

    try {
      const res = await getVendors();
      const serverList = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      if (Array.isArray(serverList) && serverList.length > 0) {
        const map = new Map();
        DEFAULT_VENDORS.forEach(v => map.set(v.name.toLowerCase().trim(), v));
        loaded.forEach(v => map.set(v.name.toLowerCase().trim(), v));
        serverList.forEach(v => map.set(v.name.toLowerCase().trim(), v));
        loaded = Array.from(map.values());
      }
    } catch (err) {
      console.warn('Failed to fetch vendors from backend, using defaults:', err);
    }

    if (loaded.length === 0) {
      loaded = DEFAULT_VENDORS;
    }

    setVendors(loaded);
    persistVendors(loaded);
    setLoadingVendors(false);
  };

  const persistVendors = (list) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_VENDORS_KEY, JSON.stringify(list));
    } catch (e) {}
  };

  // ── DESCRIPTION ACTIONS ──
  const handleAddDescription = (e) => {
    if (e) e.preventDefault();
    const trimmed = newDesc.trim();
    if (!trimmed) {
      showToast('Please enter an item description', 'warning');
      return;
    }
    if (descriptions.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Item "${trimmed}" already in list`, 'warning');
      return;
    }
    const updated = [trimmed, ...descriptions];
    setDescriptions(updated);
    persistDescriptions(updated);
    setNewDesc('');
    showToast(`Added "${trimmed}" to saved items`, 'success');

    // Auto-select
    if (onSelect) {
      onSelect({ itemDescription: trimmed });
      onClose();
    }
  };

  const handleSaveEditDescription = (idx) => {
    const trimmed = editingDescText.trim();
    if (!trimmed) {
      showToast('Description cannot be empty', 'warning');
      return;
    }
    const updated = [...descriptions];
    updated[idx] = trimmed;
    setDescriptions(updated);
    persistDescriptions(updated);
    setEditingDescIdx(null);
    setEditingDescText('');
    showToast(`Description updated to "${trimmed}"`, 'success');
  };

  const handleDeleteDescription = (idx) => {
    const item = descriptions[idx];
    const updated = descriptions.filter((_, i) => i !== idx);
    setDescriptions(updated);
    persistDescriptions(updated);
    showToast(`Removed "${item}" from items`, 'info');
    setDeleteConfirm({ isOpen: false, type: '', item: null });
  };

  // ── VENDOR ACTIONS ──
  const handleAddVendor = async (e) => {
    if (e) e.preventDefault();
    const name = newVendorForm.name.trim();
    if (!name) {
      showToast('Please enter a supplier/vendor name', 'warning');
      return;
    }

    setAddingVendor(true);
    let newEntry = {
      name,
      phone: newVendorForm.phone.trim(),
      notes: newVendorForm.notes.trim()
    };

    try {
      const res = await createVendor(newEntry);
      if (res && res.data && res.data._id) {
        newEntry._id = res.data._id;
      }
    } catch (err) {
      console.warn('Backend create vendor failed, saving locally:', err.message);
    }

    const updated = [newEntry, ...vendors];
    setVendors(updated);
    persistVendors(updated);
    setNewVendorForm({ name: '', phone: '', notes: '' });
    setAddingVendor(false);
    showToast(`Supplier "${name}" added!`, 'success');

    // Auto-select
    if (onSelect) {
      onSelect({ vendorName: name });
      onClose();
    }
  };

  const handleSaveEditVendor = async (vendor, idx) => {
    const name = editingVendorForm.name.trim();
    if (!name) {
      showToast('Supplier name cannot be empty', 'warning');
      return;
    }

    const hasBackendId = vendor && vendor._id && !String(vendor._id).startsWith('idx-');
    if (hasBackendId) {
      try {
        await updateVendor(vendor._id, editingVendorForm);
      } catch (err) {
        console.warn('Backend update vendor failed:', err);
      }
    }

    const updated = vendors.map((v, i) => {
      if ((vendor._id && v._id === vendor._id) || i === idx) {
        return { ...v, ...editingVendorForm, name };
      }
      return v;
    });

    setVendors(updated);
    persistVendors(updated);
    setEditingVendorId(null);
    showToast(`Supplier "${name}" updated`, 'success');
  };

  const handleDeleteVendor = async () => {
    const vendor = deleteConfirm.item;
    if (!vendor) return;

    const hasBackendId = vendor && vendor._id && !String(vendor._id).startsWith('idx-');
    if (hasBackendId) {
      try {
        await deleteVendor(vendor._id);
      } catch (err) {
        console.warn('Backend delete vendor failed:', err);
      }
    }

    const updated = vendors.filter(v => {
      if (vendor._id && v._id) return v._id !== vendor._id;
      return v.name !== vendor.name;
    });

    setVendors(updated);
    persistVendors(updated);
    showToast(`Supplier "${vendor.name}" deleted`, 'info');
    setDeleteConfirm({ isOpen: false, type: '', item: null });
  };

  if (!isOpen) return null;

  // Filtered lists
  const filteredDescriptions = descriptions.filter(d => 
    d.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.phone && v.phone.includes(searchQuery)) ||
    (v.notes && v.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl z-10 flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                {activeTab === 'descriptions' ? <Package size={20} /> : <Building2 size={20} />}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Manage Descriptions & Vendors
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Quick-add, edit, or delete items and suppliers for fast purchase logging.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 pt-3 shrink-0">
            <button
              type="button"
              onClick={() => { setActiveTab('descriptions'); setSearchQuery(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'descriptions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Package size={14} />
              <span>Item Descriptions ({descriptions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('vendors'); setSearchQuery(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'vendors'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Building2 size={14} />
              <span>Vendors & Suppliers ({vendors.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="pt-3 pb-2 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'descriptions' ? "Search item descriptions..." : "Search suppliers by name, phone or notes..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* TAB 1: DESCRIPTIONS */}
          {activeTab === 'descriptions' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Add form */}
              <form onSubmit={handleAddDescription} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Add New Item Description
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. MS Channel 75x40 mm, Zinc Spray Can..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!newDesc.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <Plus size={14} />
                    <span>Add Item</span>
                  </button>
                </div>
              </form>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredDescriptions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No items match "{searchQuery}"
                  </div>
                ) : (
                  filteredDescriptions.map((item, idx) => {
                    const isEditing = editingDescIdx === idx;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 transition-all"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <input
                              type="text"
                              value={editingDescText}
                              onChange={(e) => setEditingDescText(e.target.value)}
                              autoFocus
                              className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditDescription(idx)}
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                              title="Save Changes"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDescIdx(null)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                            <Package size={13} className="text-indigo-500 shrink-0" />
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item}
                            </span>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelect) {
                                  onSelect({ itemDescription: item });
                                  onClose();
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                            >
                              Select
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDescIdx(idx);
                                setEditingDescText(item);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                              title="Edit item"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm({ isOpen: true, type: 'description', item: idx })}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VENDORS */}
          {activeTab === 'vendors' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Add Vendor Form */}
              <form onSubmit={handleAddVendor} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 shrink-0">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Add New Supplier / Vendor
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      required
                      placeholder="Vendor / Shop Name *"
                      value={newVendorForm.name}
                      onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Phone (Optional)"
                      value={newVendorForm.phone}
                      onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      disabled={addingVendor || !newVendorForm.name.trim()}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      {addingVendor ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                      <span>+ Add Vendor</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Vendors List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {loadingVendors ? (
                  <div className="flex items-center justify-center py-10 text-slate-400 text-xs gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Loading vendors...</span>
                  </div>
                ) : filteredVendors.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No suppliers match "{searchQuery}"
                  </div>
                ) : (
                  filteredVendors.map((vendor, idx) => {
                    const id = vendor._id || `v-${idx}`;
                    const isEditing = editingVendorId === id;

                    return (
                      <div
                        key={id}
                        className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 transition-all flex items-center justify-between gap-2"
                      >
                        {isEditing ? (
                          <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingVendorForm.name}
                              onChange={(e) => setEditingVendorForm({ ...editingVendorForm, name: e.target.value })}
                              placeholder="Vendor Name"
                              className="w-full sm:w-1/2 px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg text-xs font-semibold"
                            />
                            <input
                              type="text"
                              value={editingVendorForm.phone}
                              onChange={(e) => setEditingVendorForm({ ...editingVendorForm, phone: e.target.value })}
                              placeholder="Phone"
                              className="w-full sm:w-1/2 px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg text-xs font-semibold"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSaveEditVendor(vendor, idx)}
                                className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingVendorId(null)}
                                className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <Building2 size={14} className="text-indigo-500 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                                {vendor.name}
                              </span>
                              {(vendor.phone || vendor.notes) && (
                                <span className="text-[11px] text-slate-400 flex items-center gap-2 truncate">
                                  {vendor.phone && <span>📞 {vendor.phone}</span>}
                                  {vendor.notes && <span>• {vendor.notes}</span>}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelect) {
                                  onSelect({ vendorName: vendor.name });
                                  onClose();
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                            >
                              Select
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingVendorId(id);
                                setEditingVendorForm({
                                  name: vendor.name || '',
                                  phone: vendor.phone || '',
                                  notes: vendor.notes || ''
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                              title="Edit vendor"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm({ isOpen: true, type: 'vendor', item: vendor })}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                              title="Delete vendor"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span>Click <strong>Select</strong> to auto-fill into Description / Vendor</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          title={deleteConfirm.type === 'vendor' ? 'Delete Supplier' : 'Delete Item Description'}
          message={
            deleteConfirm.type === 'vendor'
              ? `Are you sure you want to delete supplier "${deleteConfirm.item?.name}"?`
              : `Are you sure you want to remove item "${descriptions[deleteConfirm.item]}"?`
          }
          onConfirm={deleteConfirm.type === 'vendor' ? handleDeleteVendor : () => handleDeleteDescription(deleteConfirm.item)}
          onClose={() => setDeleteConfirm({ isOpen: false, type: '', item: null })}
        />
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default DescriptionVendorModal;
