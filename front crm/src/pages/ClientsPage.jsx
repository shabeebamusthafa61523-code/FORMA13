import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Plus, Filter } from 'lucide-react';
import { getClients, updateClient, deleteClient } from '../services/clientService';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import ClientTableView from '../components/clients/ClientTableView';
import { AMOUNT_STATUSES } from '../utils/clientStatusUtils';
import EditClientModal from '../components/clients/EditClientModal';
import { useToast } from '../components/ToastProvider';
import { formatApiError } from '../utils/errorUtils';
import ExcelExportButton from '../components/ExcelExportButton';

const ClientsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [amountStatusFilter, setAmountStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalClients, setTotalClients] = useState(0);

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  const fetchClientsList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getClients({
        search,
        amountStatus: amountStatusFilter || undefined,
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'clientDate',
        sortOrder: 'desc'
      });

      if (res && res.success) {
        const rawClients = res.data.clients || [];
        const sorted = rawClients.slice().sort((a, b) => {
          const dA = new Date(a.clientDate || a.createdAt || 0).getTime();
          const dB = new Date(b.clientDate || b.createdAt || 0).getTime();
          return dB - dA;
        });
        setClients(sorted);
        setTotalClients(res.data.pagination?.total ?? (sorted.length || 0));
      } else {
        showToast(formatApiError(res, "Failed to load clients list"), "error");
      }
    } catch (err) {
      console.error("Failed to fetch clients list:", err);
      showToast(formatApiError(err, "Server error fetching clients list"), "error");
    } finally {
      setLoading(false);
    }
  }, [search, amountStatusFilter, currentPage, itemsPerPage, showToast]);

  useEffect(() => {
    fetchClientsList();
  }, [fetchClientsList]);

  const handleStatusChange = async (clientId, newStatus) => {
    const originalClients = [...clients];
    // Immediate optimistic update
    setClients(prev =>
      prev.map(c => {
        const id = c._id || c.id || c.clientId;
        return id === clientId ? { ...c, amountStatus: newStatus } : c;
      })
    );

    try {
      const res = await updateClient(clientId, { amountStatus: newStatus });
      if (res && res.success) {
        showToast(`Amount status set to "${newStatus}"`, "success");
      } else {
        setClients(originalClients);
        showToast(formatApiError(res, "Failed to update amount status"), "error");
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      setClients(originalClients);
      showToast(formatApiError(err, "Server error updating status"), "error");
    }
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setIsEditOpen(true);
  };

  const promptDeleteClient = (id) => {
    setClientToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      const res = await deleteClient(clientToDelete);
      if (res && res.success) {
        showToast("Client deleted successfully", "success");
        setClients(prev => prev.filter(c => (c._id || c.id) !== clientToDelete));
      } else {
        showToast(formatApiError(res, "Failed to delete client"), "error");
      }
    } catch (err) {
      console.error("Failed to delete client:", err);
      showToast(formatApiError(err, "Server error deleting client"), "error");
    } finally {
      setDeleteModalOpen(false);
      setClientToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Clients Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Manage client directory, records, quotations, and financial ledgers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExcelExportButton
            data={clients.map(c => ({
              'Date': c.clientDate ? new Date(c.clientDate).toLocaleDateString('en-IN') : (c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '-'),
              'Client Name': c.clientName || c.companyName || '',
              'Phone Number': c.phone || '',
              'Amnt Status': c.amountStatus || 'Beginning Stage',
              'Remarks': c.notes || c.remarks || ''
            }))}
            fileName="clients_list_export"
            sheetName="Clients"
          />
          <button
            onClick={() => navigate('/clients/new')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Add New Client</span>
          </button>
        </div>
      </div>

      {/* Toolbar with Search and Amount Status Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search clients by name or phone..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Filter size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
            <select
              value={amountStatusFilter}
              onChange={(e) => { setAmountStatusFilter(e.target.value); setCurrentPage(1); }}
              aria-label="Filter by Amount Status"
              className="pl-8 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Amount Statuses</option>
              {AMOUNT_STATUSES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Client List Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
          <p className="text-sm font-semibold text-slate-500">Loading Clients...</p>
        </div>
      ) : (
        <ClientTableView
          clients={clients}
          onEdit={handleEditClient}
          onDelete={promptDeleteClient}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Clients Pagination */}
      {!loading && totalClients > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalClients}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          label='clients'
          className='shadow-md'
        />
      )}

      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
        onSuccess={() => {
          fetchClientsList();
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Client"
        message="Are you sure you want to delete this client? This action cannot be undone."
        confirmText="Delete Client"
        onConfirm={confirmDeleteClient}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default ClientsPage;
