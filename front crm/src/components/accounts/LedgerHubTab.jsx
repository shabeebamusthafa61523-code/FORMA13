import React, { useState } from 'react';
import { Users, Building2, BookOpen } from 'lucide-react';
import EmployeeLedgerTab from './EmployeeLedgerTab';
import SuppliersLedgerTab from './SuppliersLedgerTab';
import LedgerTab from './LedgerTab';

const LedgerHubTab = () => {
  const [activeLedgerSubTab, setActiveLedgerSubTab] = useState('emp-ledger'); // 'emp-ledger' | 'suppliers-ledger' | 'client-ledger'

  return (
    <div className="space-y-4">
      {/* Ledger Sub-tab Navigation Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveLedgerSubTab('emp-ledger')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeLedgerSubTab === 'emp-ledger'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users size={15} />
            <span>Employee Ledger</span>
          </button>

          <button
            onClick={() => setActiveLedgerSubTab('suppliers-ledger')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeLedgerSubTab === 'suppliers-ledger'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Building2 size={15} />
            <span>Suppliers Ledger</span>
          </button>

          <button
            onClick={() => setActiveLedgerSubTab('client-ledger')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeLedgerSubTab === 'client-ledger'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen size={15} />
            <span>Client & Party Ledger</span>
          </button>
        </div>
      </div>

      {/* Render Active Sub-Ledger Panel */}
      <div>
        {activeLedgerSubTab === 'emp-ledger' && <EmployeeLedgerTab />}
        {activeLedgerSubTab === 'suppliers-ledger' && <SuppliersLedgerTab />}
        {activeLedgerSubTab === 'client-ledger' && <LedgerTab />}
      </div>
    </div>
  );
};

export default LedgerHubTab;
