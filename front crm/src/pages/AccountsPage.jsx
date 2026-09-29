import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import AddExpenseTab from '../components/accounts/AddExpenseTab';
import SalaryPaymentTab from '../components/accounts/SalaryPaymentTab';
import CashBookTab from '../components/accounts/CashBookTab';
import ExpenseReportsTab from '../components/accounts/ExpenseReportsTab';
import IncomeTab from '../components/accounts/IncomeTab';
import CreateInvoiceTab from '../components/accounts/CreateInvoiceTab';
import SalesTab from '../components/accounts/SalesTab';
import PurchaseTab from '../components/accounts/PurchaseTab';
import CapitalTab from '../components/accounts/CapitalTab';
import OperationTab from '../components/accounts/OperationTab';
import LedgerHubTab from '../components/accounts/LedgerHubTab';
import LedgerTab from '../components/accounts/LedgerTab';
import EmployeeLedgerTab from '../components/accounts/EmployeeLedgerTab';

const tabs = [
  { id: 'capital', label: 'Capital', path: '/accounts/capital' },
  { id: 'sales', label: 'Sales', path: '/accounts/sales' },
  { id: 'income', label: 'Income', path: '/accounts/income' },
  { id: 'purchase', label: 'Purchase', path: '/accounts/purchase' },
  { id: 'expenses', label: 'Expenses', path: '/accounts/expenses' },
  { id: 'salary', label: 'Wage', path: '/accounts/salary' },
  { id: 'ledger', label: 'Ledger', path: '/accounts/ledger' },
  { id: 'cash-book', label: 'Day Book', path: '/accounts/cash-book' },
  { id: 'reports', label: 'Profit & Loss', path: '/accounts/reports' }
];

const AccountsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = (path) => {
    if (path.includes('/accounts/create-invoice')) return 'create-invoice';
    if (path.includes('/accounts/income') || path === '/income') return 'income';
    if (path.includes('/accounts/proforma')) return 'proforma';
    if (path.includes('/accounts/sales')) return 'sales';
    if (path.includes('/accounts/employee-ledger') || path.includes('/accounts/ledger') || path === '/ledger' || path === '/employee-ledger') return 'ledger';
    if (path.includes('/accounts/capital') || path === '/capital') return 'capital';
    if (path.includes('/accounts/purchase')) return 'purchase';
    if (path.includes('/accounts/categories') || path.includes('/accounts/expenses')) return 'expenses';
    if (path.includes('/accounts/salary')) return 'salary';
    if (path.includes('/accounts/cash-book')) return 'cash-book';
    if (path.includes('/accounts/operation')) return 'operation';
    if (path.includes('/accounts/reports')) return 'reports';
    return 'cash-book';
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleTabChange = (tabId, path) => {
    setActiveTab(tabId);
    navigate(path);
  };

  return (
    <div className="space-y-3">
      {/* Clean Minimal Accounts Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Accounts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Financial management and ledger summaries
          </p>
        </div>

        {/* Flat minimal tab navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id, tab.path)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Panels */}
      <div className="bg-white">
        {activeTab === 'capital' && <CapitalTab />}
        {activeTab === 'sales' && <SalesTab />}
        {activeTab === 'proforma' && <CreateInvoiceTab isProformaMode={true} />}
        {activeTab === 'income' && <IncomeTab />}
        {activeTab === 'purchase' && <PurchaseTab />}
        {activeTab === 'expenses' && <AddExpenseTab />}
        {activeTab === 'salary' && <SalaryPaymentTab />}
        {activeTab === 'cash-book' && <CashBookTab />}
        {activeTab === 'operation' && <OperationTab />}
        {activeTab === 'reports' && <ExpenseReportsTab />}
        {activeTab === 'create-invoice' && <CreateInvoiceTab />}
        {activeTab === 'ledger' && <LedgerHubTab />}
      </div>
    </div>
  );
};

export default AccountsPage;
