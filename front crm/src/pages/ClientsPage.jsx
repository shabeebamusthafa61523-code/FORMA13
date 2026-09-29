import React, { useState, useEffect } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';
import { getClients, deleteClient } from '../services/clientService';
import ConfirmModal from '../components/ConfirmModal';
import ClientTableView from '../components/clients/ClientTableView';
import CreateClientModal from '../components/clients/CreateClientModal';
import EditClientModal from '../components/clients/EditClientModal';
import { useToast } from '../components/ToastProvider';
import { formatApiError } from '../utils/errorUtils';
import ExcelExportButton from '../components/ExcelExportButton';

const ClientsPage = () => {
  const { showToast } = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => {
    fetchClientsList();
  }, [search]);

  const fetchClientsList = async () => {
    setLoading(true);
    try {
      const res = await getClients({
        search,
        limit: 100
      });

      if (res && res.success) {
        setClients(res.data.clients || []);
      } else {
        showToast(formatApiError(res, "Failed to load clients list"), "error");
      }
    } catch (err) {
      console.error("Failed to fetch clients list:", err);
      showToast(formatApiError(err, "Server error fetching clients list"), "error");
    } finally {
      setLoading(false);
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
            Clients
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Manage client directory and records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExcelExportButton
            data={clients.map(c => ({
              'Client Name': c.clientName || c.companyName || '',
              'Phone Number': c.phone || '',
              'Remarks': c.notes || c.remarks || ''
            }))}
            fileName="clients_list_export"
            sheetName="Clients"
          />
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Add New Client</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name or phone..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden"
          />
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
        />
      )}

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          showToast("Client created successfully!", "success");
          fetchClientsList();
        }}
      />

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
