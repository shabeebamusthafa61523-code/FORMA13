import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  X, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Loader2, 
  Phone, 
  Check
} from 'lucide-react';
import { createVendor, updateVendor, deleteVendor, getVendors } from '../../services/accountsService';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';

const VendorModal = ({
  isOpen,
  onClose,
  onSelectVendor,
  initialVendors = [],
  onRefreshVendors
}) => {
  const { showToast } = useToast();
  const [vendorsList, setVendorsList] = useState(initialVendors);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State (Add / Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: ''
  });

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, vendor: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
    }
  }, [isOpen]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await getVendors();
      if (res && res.success && Array.isArray(res.data)) {
        setVendorsList(res.data);
        if (onRefreshVendors) onRefreshVendors(res.data);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', notes: '' });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEditClick = (vendor) => {
    setIsEditing(true);
    setEditingId(vendor._id || vendor.id);
    setFormData({
      name: vendor.name || '',
      phone: vendor.phone || '',
      notes: vendor.notes || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Supplier Name is required.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        const res = await updateVendor(editingId, formData);
        if (res && res.success) {
          showToast('Supplier updated.', 'success');
          resetForm();
          fetchVendors();
        } else {
          showToast(res?.message || 'Failed to update supplier.', 'warning');
        }
      } else {
        const res = await createVendor(formData);
        if (res && res.success) {
          showToast(`Supplier '${formData.name.trim()}' added.`, 'success');
          const createdVendor = res.data;
          resetForm();
          fetchVendors();
          if (onSelectVendor && createdVendor?.name) {
            onSelectVendor(createdVendor.name);
            onClose();
          }
        } else {
          showToast(res?.message || 'Failed to add supplier.', 'warning');
        }
      }
    } catch (err) {
      console.error('Error saving vendor:', err);
      showToast('Error saving supplier.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExecute = async () => {
    if (!deleteConfirm.vendor) return;
    const vendorId = deleteConfirm.vendor._id || deleteConfirm.vendor.id;
    setDeleting(true);
    try {
      const res = await deleteVendor(vendorId);
      if (res && res.success) {
        showToast('Supplier deleted.', 'success');
        setDeleteConfirm({ isOpen: false, vendor: null });
        if (isEditing && editingId === vendorId) resetForm();
        fetchVendors();
      } else {
        showToast(res?.message || 'Failed to delete supplier.', 'warning');
      }
    } catch (err) {
      console.error('Error deleting vendor:', err);
      showToast('Failed to delete supplier.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredVendors = vendorsList.filter(v => 
    (v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.phone || '').includes(searchQuery)
  );

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl z-10 max-h-[85vh] flex flex-col overflow-hidden text-xs"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Building2 size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span>Manage Suppliers</span>
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Add / Edit Form */}
          <form onSubmit={handleSubmit} className="py-3 border-b border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {isEditing ? 'Edit Supplier' : 'Add New Supplier'}
              </span>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Supplier Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-semibold text-slate-800 dark:text-slate-100"
              />
              <input
                type="text"
                placeholder="Phone (Optional)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-medium text-slate-800 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <Plus size={14} />
                  <span>{isEditing ? 'Update Supplier' : 'Add Supplier'}</span>
                </>
              )}
            </button>
          </form>

          {/* Search & Supplier List */}
          <div className="flex-1 py-3 flex flex-col min-h-0">
            {vendorsList.length > 5 && (
              <div className="relative mb-2 shrink-0">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {loading ? (
                <div className="py-6 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={15} className="animate-spin text-indigo-500" />
                  <span>Loading suppliers...</span>
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No suppliers registered yet.
                </div>
              ) : (
                filteredVendors.map((vendor) => (
                  <div
                    key={vendor._id || vendor.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">
                        {vendor.name}
                      </h4>
                      {vendor.phone && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone size={10} />
                          {vendor.phone}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onSelectVendor && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectVendor(vendor.name);
                            showToast(`Selected '${vendor.name}'`, 'info');
                            onClose();
                          }}
                          className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-600 hover:text-white transition flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <Check size={11} />
                          <span>Select</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEditClick(vendor)}
                        className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                        title="Edit Supplier"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({ isOpen: true, vendor })}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Delete Supplier"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, vendor: null })}
          onConfirm={handleDeleteExecute}
          title="Delete Supplier"
          message={`Delete supplier '${deleteConfirm.vendor?.name}'?`}
          confirmText={deleting ? "Deleting..." : "Delete"}
          type="danger"
        />
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default VendorModal;
