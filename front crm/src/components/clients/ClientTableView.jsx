import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Trash2, Building, ExternalLink } from 'lucide-react';

const ClientTableView = ({ clients, onEdit, onDelete }) => {
  const navigate = useNavigate();

  return (
    <div className="w-full overflow-hidden rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-lg">
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-black uppercase text-slate-500 tracking-wider">
              <th className="py-4 px-6">Client Name</th>
              <th className="py-4 px-6">Phone Number</th>
              <th className="py-4 px-6">Remarks</th>
              <th className="py-4 px-6 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                  No clients found.
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                const id = client._id || client.id || client.clientId;
                const name = client.clientName || client.companyName || 'N/A';
                const phone = client.phone || 'N/A';
                const remarks = client.notes || client.remarks || '-';

                return (
                  <tr
                    key={id}
                    className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Client Name Column */}
                    <td className="py-4 px-6 font-bold text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                          {name[0]?.toUpperCase() || 'C'}
                        </div>
                        <span className="truncate max-w-[220px]">{name}</span>
                      </div>
                    </td>

                    {/* Phone Number */}
                    <td className="py-4 px-6 font-medium text-slate-600 dark:text-slate-300 font-mono">
                      {phone}
                    </td>

                    {/* Remarks */}
                    <td className="py-4 px-6 text-slate-500 dark:text-slate-400 max-w-[300px] truncate">
                      {remarks}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit?.(client)}
                          title="Edit Client"
                          className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete?.(id)}
                          title="Delete Client"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientTableView;
