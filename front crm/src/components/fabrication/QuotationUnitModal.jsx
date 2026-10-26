import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ruler, 
  X, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  RotateCcw,
  Database,
  Loader2
} from 'lucide-react';
import { useToast } from '../ToastProvider';
import {
  getFabricationUnits,
  createFabricationUnit,
  updateFabricationUnit,
  deleteFabricationUnit,
  resetFabricationUnits
} from '../../services/fabricationService';

export const DEFAULT_FABRICATION_UNITS = [
  'Sq.Ft',
  'Inches',
  'Feet',
  'Kg',
  'Nos',
  'Lengths',
  'Meters',
  'Tons',
  'Box',
  'Litres',
  'Lumpsum',
  'Hours',
  'Days'
];

export const LOCAL_STORAGE_UNITS_KEY = 'crm_fab_quotation_units';

const QuotationUnitModal = ({
  isOpen,
  onClose,
  selectedUnit = '',
  onSelectUnit,
  onUnitsChanged
}) => {
  const { showToast } = useToast();
  const [units, setUnits] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_UNITS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_FABRICATION_UNITS;
  });

  const [dbUnits, setDbUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Fetch units from MongoDB on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchUnits = async () => {
      try {
        setLoading(true);
        const res = await getFabricationUnits();
        if (isMounted && res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setDbUnits(res.data);
          const names = res.data.map(u => u.name);
          setUnits(names);
          try {
            localStorage.setItem(LOCAL_STORAGE_UNITS_KEY, JSON.stringify(names));
          } catch (e) {}
          if (onUnitsChanged) onUnitsChanged(names);

          // Auto-migrate any custom units from localStorage to MongoDB
          try {
            const localStored = localStorage.getItem(LOCAL_STORAGE_UNITS_KEY);
            if (localStored) {
              const parsed = JSON.parse(localStored);
              if (Array.isArray(parsed)) {
                for (const locName of parsed) {
                  if (locName && !names.some(n => n.toLowerCase() === locName.toLowerCase())) {
                    await createFabricationUnit({ name: locName });
                  }
                }
              }
            }
          } catch (migrateErr) {
            console.warn('Auto-migration error for units:', migrateErr);
          }
        }
      } catch (err) {
        console.warn('Could not fetch units from MongoDB, using cached fallback:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUnits();
    setSearchQuery('');
    setNewUnitName('');
    setEditingIndex(null);

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const saveToStorage = (updated) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_UNITS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save units to localStorage:', e);
    }
    setUnits(updated);
    if (onUnitsChanged) {
      onUnitsChanged(updated);
    }
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    const trimmed = newUnitName.trim();
    if (!trimmed) {
      showToast('Please enter a unit name or symbol (e.g. Sq.Mtr, Pcs, Bundle)', 'error');
      return;
    }

    if (units.some(u => u.toLowerCase() === trimmed.toLowerCase())) {
      showToast('This unit already exists in the list', 'error');
      return;
    }

    const updated = [...units, trimmed];
    saveToStorage(updated);
    setNewUnitName('');
    showToast(`Added "${trimmed}" to units`, 'success');

    if (onSelectUnit) {
      onSelectUnit(trimmed);
    }

    // Sync to MongoDB
    try {
      setIsSavingDb(true);
      const res = await createFabricationUnit({ name: trimmed });
      if (res?.success && res.data) {
        setDbUnits(prev => [...prev, res.data]);
      }
    } catch (err) {
      console.error('Failed to create unit in DB:', err);
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleStartEdit = (idx, text) => {
    setEditingIndex(idx);
    setEditingText(text);
  };

  const handleSaveEdit = async (idx) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      showToast('Unit name cannot be empty', 'error');
      return;
    }

    const exists = units.some((u, i) => i !== idx && u.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showToast('Another unit with this name already exists', 'error');
      return;
    }

    const updated = [...units];
    const oldName = updated[idx];
    updated[idx] = trimmed;
    saveToStorage(updated);
    setEditingIndex(null);
    showToast(`Updated "${oldName}" to "${trimmed}"`, 'success');

    if (selectedUnit === oldName && onSelectUnit) {
      onSelectUnit(trimmed);
    }

    // Find MongoDB ID and sync edit
    const dbItem = dbUnits.find(u => u.name && u.name.toLowerCase() === oldName.toLowerCase());
    if (dbItem && dbItem._id) {
      try {
        setIsSavingDb(true);
        await updateFabricationUnit(dbItem._id, { name: trimmed });
        setDbUnits(prev => prev.map(u => u._id === dbItem._id ? { ...u, name: trimmed } : u));
      } catch (err) {
        console.error('Failed to update unit in DB:', err);
      } finally {
        setIsSavingDb(false);
      }
    }
  };

  const handleDeleteUnit = async (idx) => {
    const toDelete = units[idx];
    if (units.length <= 1) {
      showToast('You must have at least one unit option', 'error');
      return;
    }

    const updated = units.filter((_, i) => i !== idx);
    saveToStorage(updated);
    showToast(`Removed "${toDelete}"`, 'info');

    if (selectedUnit === toDelete && onSelectUnit) {
      onSelectUnit(updated[0] || '');
    }

    // Find MongoDB ID and sync delete
    const dbItem = dbUnits.find(u => u.name && u.name.toLowerCase() === toDelete.toLowerCase());
    if (dbItem && dbItem._id) {
      try {
        setIsSavingDb(true);
        await deleteFabricationUnit(dbItem._id);
        setDbUnits(prev => prev.filter(u => u._id !== dbItem._id));
      } catch (err) {
        console.error('Failed to delete unit in DB:', err);
      } finally {
        setIsSavingDb(false);
      }
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset unit options back to standard default list in MongoDB?')) {
      saveToStorage(DEFAULT_FABRICATION_UNITS);
      try {
        setIsSavingDb(true);
        const res = await resetFabricationUnits();
        if (res?.success && Array.isArray(res.data)) {
          setDbUnits(res.data);
          const names = res.data.map(u => u.name);
          saveToStorage(names);
        }
      } catch (err) {
        console.error('Failed to reset units in DB:', err);
      } finally {
        setIsSavingDb(false);
      }
      showToast('Units reset to defaults', 'info');
    }
  };

  if (!isOpen) return null;

  const filteredUnits = units.filter(u => 
    u.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                <Ruler size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Quotation Units</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    {units.length}
                  </span>
                  <span className="flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    <Database size={10} />
                    <span>MongoDB Synced</span>
                  </span>
                  {isSavingDb && (
                    <span className="flex items-center gap-1 text-[10.5px] text-amber-600 font-semibold animate-pulse">
                      <Loader2 size={10} className="animate-spin" />
                      <span>Saving...</span>
                    </span>
                  )}
                  {loading && (
                    <span className="flex items-center gap-1 text-[10.5px] text-slate-400 font-medium">
                      <Loader2 size={10} className="animate-spin" />
                      <span>Loading...</span>
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Add, edit, or delete units of measurement for quotation items & expenses
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Add New Unit Input */}
          <form onSubmit={handleAddUnit} className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Add New Measurement Unit
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Sq.Ft, Nos, Kg, Meters, Pcs, Bundle, Set..."
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus size={14} className="stroke-[3]" />
                <span>Add Unit</span>
              </button>
            </div>
          </form>

          {/* Search Bar */}
          <div className="p-4 pb-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Units List */}
          <div className="flex-1 overflow-y-auto p-4 pt-1 space-y-1.5 min-h-[220px]">
            {filteredUnits.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No units match "{searchQuery}"
              </div>
            ) : (
              filteredUnits.map((u) => {
                const originalIndex = units.indexOf(u);
                const isSelected = selectedUnit === u;
                const isEditing = editingIndex === originalIndex;

                return (
                  <div
                    key={originalIndex}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' 
                        : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          autoFocus
                          className="flex-1 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-950 border border-indigo-500 rounded-lg focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(originalIndex);
                            if (e.key === 'Escape') setEditingIndex(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(originalIndex)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Save"
                        >
                          <Check size={14} className="stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          if (onSelectUnit) {
                            onSelectUnit(u);
                            showToast(`Selected "${u}"`, 'info');
                          }
                        }}
                        className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-600 text-white' 
                            : 'border-slate-300 dark:border-slate-700'
                        }`}>
                          {isSelected && <Check size={10} className="stroke-[3]" />}
                        </div>
                        <span className={`text-xs font-semibold ${
                          isSelected ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {u}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider ml-auto mr-3">
                            Current
                          </span>
                        )}
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(originalIndex, u)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition cursor-pointer"
                          title="Edit unit name"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUnit(originalIndex)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                          title="Delete unit"
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

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              title="Reset all units to standard default list"
            >
              <RotateCcw size={12} />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default QuotationUnitModal;
