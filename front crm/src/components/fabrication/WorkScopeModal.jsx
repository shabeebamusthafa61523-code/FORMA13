import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  X, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  RotateCcw
} from 'lucide-react';
import { useToast } from '../ToastProvider';

export const DEFAULT_WORK_SCOPE_DESCRIPTIONS = [
  'Main Gate MS Tubular Frame with CNC Laser Sheet Design',
  'Sliding Main Gate with Heavy Duty Track & Roller Wheels',
  'Stainless Steel (SS 304) Staircase Railing with Toughened Glass',
  'MS Window Safety Grill with Primer & Enamel Coating',
  'Industrial Truss Roofing with Color Coated Sheets',
  'Spiral Staircase with Checker Plate Steps & Handrail',
  'Balcony Safety Railing with Glass Clamps',
  'Heavy Duty Rolling Shutter with Spring & Pulley System',
  'Compound Wall Security Spikes & Chainlink Fencing',
  'Portico Canopy / Shed with Polycarbonate Roofing Sheet',
  'Structural Steel Mezzanine Floor with I-Beam Columns',
  'Fire Exit Heavy Duty Steel Single Door with Push Bar',
  'MS Pergola / Gazebo Structure with Powder Coating',
  'Rolling Shutter Grill with Motorized Drive Option',
  'Steel Water Tank Overhead Support Stand Structure'
];

export const LOCAL_STORAGE_WORK_SCOPES_KEY = 'crm_fab_work_scope_descriptions';

const WorkScopeModal = ({
  isOpen,
  onClose,
  selectedDescription = '',
  onSelectDescription,
  onDescriptionsChanged
}) => {
  const { showToast } = useToast();
  const [descriptions, setDescriptions] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_WORK_SCOPES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_WORK_SCOPE_DESCRIPTIONS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [newDescriptionText, setNewDescriptionText] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_WORK_SCOPES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDescriptions(parsed);
          }
        }
      } catch (e) {}
      setSearchQuery('');
      setNewDescriptionText('');
      setEditingIndex(null);
    }
  }, [isOpen]);

  const saveToStorage = (updated) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_WORK_SCOPES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save work scope descriptions to localStorage:', e);
    }
    setDescriptions(updated);
    if (onDescriptionsChanged) {
      onDescriptionsChanged(updated);
    }
  };

  const handleAddDescription = (e) => {
    e.preventDefault();
    const trimmed = newDescriptionText.trim();
    if (!trimmed) {
      showToast('Please enter an item / work scope description', 'error');
      return;
    }

    if (descriptions.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      showToast('This work scope description already exists in the list', 'error');
      return;
    }

    const updated = [...descriptions, trimmed];
    saveToStorage(updated);
    setNewDescriptionText('');
    showToast(`Added "${trimmed}" to descriptions`, 'success');

    if (onSelectDescription) {
      onSelectDescription(trimmed);
    }
  };

  const handleStartEdit = (idx, text) => {
    setEditingIndex(idx);
    setEditingText(text);
  };

  const handleSaveEdit = (idx) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      showToast('Description cannot be empty', 'error');
      return;
    }

    const exists = descriptions.some((d, i) => i !== idx && d.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showToast('Another description with this name already exists', 'error');
      return;
    }

    const updated = [...descriptions];
    const oldName = updated[idx];
    updated[idx] = trimmed;
    saveToStorage(updated);
    setEditingIndex(null);
    showToast(`Updated "${oldName}" to "${trimmed}"`, 'success');

    if (selectedDescription === oldName && onSelectDescription) {
      onSelectDescription(trimmed);
    }
  };

  const handleDeleteDescription = (idx) => {
    const toDelete = descriptions[idx];
    if (descriptions.length <= 1) {
      showToast('You must have at least one description option', 'error');
      return;
    }

    const updated = descriptions.filter((_, i) => i !== idx);
    saveToStorage(updated);
    showToast(`Removed "${toDelete}"`, 'info');

    if (selectedDescription === toDelete && onSelectDescription) {
      onSelectDescription('');
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset work scope descriptions back to standard fabrication list?')) {
      saveToStorage(DEFAULT_WORK_SCOPE_DESCRIPTIONS);
      showToast('Work scope descriptions reset to defaults', 'info');
    }
  };

  if (!isOpen) return null;

  const filteredDescriptions = descriptions.filter(d => 
    d.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Work Scope Descriptions</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    {descriptions.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Manage preset descriptions for quotations & work measurements
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

          {/* Add New Description Input */}
          <form onSubmit={handleAddDescription} className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Add New Work Scope Description
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. MS Sliding Gate with Laser Cut Panels (14x7 ft)..."
                value={newDescriptionText}
                onChange={(e) => setNewDescriptionText(e.target.value)}
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
                placeholder="Search descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Descriptions List */}
          <div className="flex-1 overflow-y-auto p-4 pt-1 space-y-1.5 min-h-[240px]">
            {filteredDescriptions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No descriptions match "{searchQuery}"
              </div>
            ) : (
              filteredDescriptions.map((desc) => {
                const originalIndex = descriptions.indexOf(desc);
                const isSelected = selectedDescription === desc;
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
                            if (onSelectDescription) {
                              onSelectDescription(desc);
                              onClose();
                            }
                          }}
                          className="flex items-center gap-2 flex-1 cursor-pointer pr-2"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                            {desc}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.2 rounded-md shrink-0">
                              Selected
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(originalIndex, desc)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Edit Description"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDescription(originalIndex)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                            title="Delete Description"
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
              title="Reset to default work scope descriptions"
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

export default WorkScopeModal;
