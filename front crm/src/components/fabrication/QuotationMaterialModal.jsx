import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  X, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  RotateCcw,
  Sparkles,
  Database,
  Loader2
} from 'lucide-react';
import { useToast } from '../ToastProvider';
import {
  getFabricationMaterials,
  createFabricationMaterial,
  updateFabricationMaterial,
  deleteFabricationMaterial,
  resetFabricationMaterials
} from '../../services/fabricationService';

export const DEFAULT_FABRICATION_MATERIALS = [
  'Mild Steel (MS)',
  'Stainless Steel (SS 304)',
  'Stainless Steel (SS 316)',
  'Galvanized Iron (GI)',
  'Aluminum',
  'Cast Iron',
  'Structural Steel (IS 2062)',
  'Carbon Steel',
  'Brass',
  'Copper',
  'Wrought Iron',
  'Sheet Metal'
];

export const LOCAL_STORAGE_MATERIALS_KEY = 'crm_fab_quotation_materials';

const QuotationMaterialModal = ({
  isOpen,
  onClose,
  selectedMaterial = '',
  onSelectMaterial,
  onMaterialsChanged
}) => {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_MATERIALS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_FABRICATION_MATERIALS;
  });

  const [dbMaterials, setDbMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [newMaterialName, setNewMaterialName] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Fetch materials from MongoDB on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchMaterials = async () => {
      try {
        setLoading(true);
        const res = await getFabricationMaterials();
        if (isMounted && res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setDbMaterials(res.data);
          const names = res.data.map(m => m.name);
          setMaterials(names);
          try {
            localStorage.setItem(LOCAL_STORAGE_MATERIALS_KEY, JSON.stringify(names));
          } catch (e) {}
          if (onMaterialsChanged) onMaterialsChanged(names);

          // Auto-migrate any custom materials found in user's localStorage to MongoDB
          try {
            const localStored = localStorage.getItem(LOCAL_STORAGE_MATERIALS_KEY);
            if (localStored) {
              const parsed = JSON.parse(localStored);
              if (Array.isArray(parsed)) {
                for (const locName of parsed) {
                  if (locName && !names.some(n => n.toLowerCase() === locName.toLowerCase())) {
                    await createFabricationMaterial({ name: locName });
                  }
                }
              }
            }
          } catch (migrateErr) {
            console.warn('Auto-migration error for materials:', migrateErr);
          }
        }
      } catch (err) {
        console.warn('Could not fetch materials from MongoDB, using cached fallback:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMaterials();
    setSearchQuery('');
    setNewMaterialName('');
    setEditingIndex(null);

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const saveToStorage = (updated) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_MATERIALS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save materials to localStorage:', e);
    }
    setMaterials(updated);
    if (onMaterialsChanged) {
      onMaterialsChanged(updated);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    const trimmed = newMaterialName.trim();
    if (!trimmed) {
      showToast('Please enter a material name', 'error');
      return;
    }

    if (materials.some(m => m.toLowerCase() === trimmed.toLowerCase())) {
      showToast('This material already exists in the list', 'error');
      return;
    }

    const updated = [...materials, trimmed];
    saveToStorage(updated);
    setNewMaterialName('');
    showToast(`Added "${trimmed}" to materials`, 'success');

    if (onSelectMaterial) {
      onSelectMaterial(trimmed);
    }

    // Sync to MongoDB
    try {
      setIsSavingDb(true);
      const res = await createFabricationMaterial({ name: trimmed });
      if (res?.success && res.data) {
        setDbMaterials(prev => [...prev, res.data]);
      }
    } catch (err) {
      console.error('Failed to create material in DB:', err);
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
      showToast('Material name cannot be empty', 'error');
      return;
    }

    const exists = materials.some((m, i) => i !== idx && m.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showToast('Another material with this name already exists', 'error');
      return;
    }

    const updated = [...materials];
    const oldName = updated[idx];
    updated[idx] = trimmed;
    saveToStorage(updated);
    setEditingIndex(null);
    showToast(`Updated "${oldName}" to "${trimmed}"`, 'success');

    if (selectedMaterial === oldName && onSelectMaterial) {
      onSelectMaterial(trimmed);
    }

    // Find MongoDB ID and sync edit
    const dbItem = dbMaterials.find(m => m.name.toLowerCase() === oldName.toLowerCase());
    if (dbItem && dbItem._id) {
      try {
        setIsSavingDb(true);
        await updateFabricationMaterial(dbItem._id, { name: trimmed });
        setDbMaterials(prev => prev.map(m => m._id === dbItem._id ? { ...m, name: trimmed } : m));
      } catch (err) {
        console.error('Failed to update material in DB:', err);
      } finally {
        setIsSavingDb(false);
      }
    }
  };

  const handleDeleteMaterial = async (idx) => {
    const toDelete = materials[idx];
    if (materials.length <= 1) {
      showToast('You must have at least one material option', 'error');
      return;
    }

    const updated = materials.filter((_, i) => i !== idx);
    saveToStorage(updated);
    showToast(`Removed "${toDelete}"`, 'info');

    if (selectedMaterial === toDelete && onSelectMaterial) {
      onSelectMaterial('');
    }

    // Find MongoDB ID and sync delete
    const dbItem = dbMaterials.find(m => m.name.toLowerCase() === toDelete.toLowerCase());
    if (dbItem && dbItem._id) {
      try {
        setIsSavingDb(true);
        await deleteFabricationMaterial(dbItem._id);
        setDbMaterials(prev => prev.filter(m => m._id !== dbItem._id));
      } catch (err) {
        console.error('Failed to delete material in DB:', err);
      } finally {
        setIsSavingDb(false);
      }
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset material options back to the default fabrication list in MongoDB?')) {
      saveToStorage(DEFAULT_FABRICATION_MATERIALS);
      try {
        setIsSavingDb(true);
        const res = await resetFabricationMaterials();
        if (res?.success && Array.isArray(res.data)) {
          setDbMaterials(res.data);
          const names = res.data.map(m => m.name);
          saveToStorage(names);
        }
      } catch (err) {
        console.error('Failed to reset materials in DB:', err);
      } finally {
        setIsSavingDb(false);
      }
      showToast('Materials reset to defaults', 'info');
    }
  };

  if (!isOpen) return null;

  const filteredMaterials = materials.filter(m => 
    m.toLowerCase().includes(searchQuery.toLowerCase().trim())
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
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Fabrication Materials</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    {materials.length}
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
                  Manage material options for quotation items and work measurements
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

          {/* Add New Material Input */}
          <form onSubmit={handleAddMaterial} className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Add New Material
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Mild Steel (MS), SS 316, Brass, GI..."
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus size={14} className="stroke-[3]" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Search Bar */}
          <div className="p-4 pb-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Materials List */}
          <div className="flex-1 overflow-y-auto p-4 pt-1 space-y-1.5 min-h-[220px]">
            {filteredMaterials.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No materials match "{searchQuery}"
              </div>
            ) : (
              filteredMaterials.map((mat) => {
                const originalIndex = materials.indexOf(mat);
                const isSelected = selectedMaterial === mat;
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(originalIndex);
                            if (e.key === 'Escape') setEditingIndex(null);
                          }}
                          className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-indigo-500 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(originalIndex)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer"
                          title="Save"
                        >
                          <Check size={14} className="stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          onClick={() => {
                            if (onSelectMaterial) {
                              onSelectMaterial(mat);
                              onClose();
                            }
                          }}
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                        >
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {mat}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.2 rounded-md">
                              Selected
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(originalIndex, mat)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Edit Material"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(originalIndex)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                            title="Delete Material"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              title="Reset to default fabrication materials"
            >
              <RotateCcw size={12} />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-xs"
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

export default QuotationMaterialModal;
