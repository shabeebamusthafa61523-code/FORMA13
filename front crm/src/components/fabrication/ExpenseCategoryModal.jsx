import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tag, 
  X, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  Loader2, 
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  getExpenseCategories, 
  createExpenseCategory, 
  updateExpenseCategory, 
  deleteExpenseCategory 
} from '../../services/accountsService';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';

export const DEFAULT_FABRICATION_CATEGORIES = [
  'Raw Material (MS/SS Steel)',
  'Pipes & Tubes',
  'Plates & Sheets',
  'Consumables (Welding Rods/Grinding)',
  'Industrial Gas (Oxygen/CO2/Argon)',
  'Fasteners & Hardware (Nuts/Bolts)',
  'Paints & Primers / Coating',
  'Crane / Forklift Rental',
  'Transport & Freight Charges',
  'Site Installation Expense',
  'Equipment Rental & Fuel',
  'Refreshments & Food for Labor',
  'Miscellaneous Fabrication Supplies'
];

const LOCAL_STORAGE_KEY = 'crm_fab_expense_categories';

const ExpenseCategoryModal = ({
  isOpen,
  onClose,
  selectedCategory = '',
  onSelectCategory,
  onCategoriesChanged
}) => {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add new state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, category: null });
  const [deleting, setDeleting] = useState(false);

  // Load categories on open
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    setLoading(true);
    let loaded = [];
    
    // 1. Try local storage first
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loaded = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read categories from localStorage', e);
    }

    // 2. Fetch from backend API
    try {
      const res = await getExpenseCategories();
      const backendCats = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      
      if (Array.isArray(backendCats) && backendCats.length > 0) {
        // Merge backend categories with defaults and loaded
        const map = new Map();
        
        // Add defaults first
        DEFAULT_FABRICATION_CATEGORIES.forEach(defName => {
          map.set(defName.toLowerCase().trim(), {
            name: defName,
            isDefault: true
          });
        });

        // Add local storage custom categories
        loaded.forEach(loc => {
          const name = typeof loc === 'string' ? loc : loc.name;
          if (name) {
            map.set(name.toLowerCase().trim(), {
              name,
              ...loc
            });
          }
        });

        // Add backend categories (giving them priority for IDs)
        backendCats.forEach(b => {
          if (b && b.name) {
            const key = b.name.toLowerCase().trim();
            const existing = map.get(key) || {};
            map.set(key, {
              ...existing,
              _id: b._id || b.id,
              name: b.name,
              isSystemDefault: b.isSystemDefault || false
            });
          }
        });

        loaded = Array.from(map.values());
      }
    } catch (err) {
      console.error('Error fetching categories from backend:', err);
    }

    // 3. Fallback to default list if still empty
    if (loaded.length === 0) {
      loaded = DEFAULT_FABRICATION_CATEGORIES.map(name => ({
        name,
        isDefault: true
      }));
    }

    setCategories(loaded);
    persistCategories(loaded);
    if (onCategoriesChanged) {
      onCategoriesChanged(loaded.map(c => typeof c === 'string' ? c : c.name));
    }
    setLoading(false);
  };

  const persistCategories = (list) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  };

  // Add new category
  const handleAddCategory = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showToast('Please enter a category name', 'warning');
      return;
    }

    // Check duplicate
    const exists = categories.some(
      c => (typeof c === 'string' ? c : c.name).toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      showToast(`Category "${trimmed}" already exists`, 'warning');
      return;
    }

    setAdding(true);
    let newEntry = { name: trimmed, isDefault: false };

    try {
      // Attempt backend create
      const res = await createExpenseCategory({ name: trimmed });
      if (res && res.data && res.data._id) {
        newEntry._id = res.data._id;
      }
    } catch (err) {
      console.warn('Backend category create failed, saving locally:', err.message);
    }

    const updated = [newEntry, ...categories];
    setCategories(updated);
    persistCategories(updated);
    if (onCategoriesChanged) {
      onCategoriesChanged(updated.map(c => typeof c === 'string' ? c : c.name));
    }
    
    showToast(`Category "${trimmed}" created!`, 'success');
    setNewCategoryName('');
    setAdding(false);

    // Auto-select newly created
    if (onSelectCategory) {
      onSelectCategory(trimmed);
      onClose();
    }
  };

  // Start editing category
  const startEditing = (item, idx) => {
    const name = typeof item === 'string' ? item : item.name;
    const id = (item && item._id) ? item._id : `idx-${idx}`;
    setEditingId(id);
    setEditingName(name);
  };

  // Save edited category
  const handleSaveEdit = async (item, idx) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      showToast('Category name cannot be empty', 'warning');
      return;
    }

    setSavingEdit(true);
    const oldName = typeof item === 'string' ? item : item.name;
    const hasBackendId = item && item._id && !String(item._id).startsWith('idx-');

    if (hasBackendId) {
      try {
        await updateExpenseCategory(item._id, { name: trimmed });
      } catch (err) {
        console.warn('Backend category update failed, updating locally:', err);
      }
    }

    const updated = categories.map((c, i) => {
      const match = (item._id && c._id === item._id) || i === idx;
      if (match) {
        return typeof c === 'string' ? trimmed : { ...c, name: trimmed };
      }
      return c;
    });

    setCategories(updated);
    persistCategories(updated);
    if (onCategoriesChanged) {
      onCategoriesChanged(updated.map(c => typeof c === 'string' ? c : c.name));
    }

    // If currently selected category was updated, update selection too
    if (selectedCategory === oldName && onSelectCategory) {
      onSelectCategory(trimmed);
    }

    showToast(`Category renamed to "${trimmed}"`, 'success');
    setEditingId(null);
    setEditingName('');
    setSavingEdit(false);
  };

  // Delete category
  const confirmDelete = async () => {
    if (!deleteConfirm.category) return;
    const item = deleteConfirm.category;
    const catName = typeof item === 'string' ? item : item.name;
    const hasBackendId = item && item._id && !String(item._id).startsWith('idx-');

    setDeleting(true);
    if (hasBackendId) {
      try {
        await deleteExpenseCategory(item._id);
      } catch (err) {
        console.warn('Backend delete failed, removing locally:', err);
      }
    }

    const updated = categories.filter(c => {
      if (item._id && c._id) return c._id !== item._id;
      const cName = typeof c === 'string' ? c : c.name;
      return cName !== catName;
    });

    setCategories(updated);
    persistCategories(updated);
    if (onCategoriesChanged) {
      onCategoriesChanged(updated.map(c => typeof c === 'string' ? c : c.name));
    }

    showToast(`Category "${catName}" deleted`, 'info');
    setDeleting(false);
    setDeleteConfirm({ isOpen: false, category: null });
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => {
    const name = typeof c === 'string' ? c : c.name;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl z-10 flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <span>Manage Expense Categories</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold">
                    {categories.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add, edit, or delete fabrication purchase and operational expense categories.
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

          {/* Add Category Input Form */}
          <form onSubmit={handleAddCategory} className="py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Add New Category
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. CNC Laser Cutting Charges, Galvanizing..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={adding || !newCategoryName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>Add Category</span>
              </button>
            </div>
          </form>

          {/* Search Filter */}
          <div className="pt-3 pb-2 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Category List */}
          <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-xs gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading categories...</span>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No categories match "{searchQuery}"
              </div>
            ) : (
              filteredCategories.map((item, idx) => {
                const name = typeof item === 'string' ? item : item.name;
                const id = (item && item._id) ? item._id : `idx-${idx}`;
                const isEditing = editingId === id;
                const isSelected = selectedCategory === name;

                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                          className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item, idx)}
                          disabled={savingEdit}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                          title="Save Changes"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {name}
                        </span>
                        {item.isDefault && (
                          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 shrink-0">
                            Preset
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectCategory) {
                              onSelectCategory(name);
                              onClose();
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditing(item, idx)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                          title="Edit Category Name"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ isOpen: true, category: item })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                          title="Delete Category"
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

          {/* Footer note */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span>Click <strong>Select</strong> to choose and auto-fill into the form</span>
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
          title="Delete Category"
          message={`Are you sure you want to delete category "${deleteConfirm.category ? (typeof deleteConfirm.category === 'string' ? deleteConfirm.category : deleteConfirm.category.name) : ''}"?`}
          onConfirm={confirmDelete}
          onClose={() => setDeleteConfirm({ isOpen: false, category: null })}
        />
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ExpenseCategoryModal;
