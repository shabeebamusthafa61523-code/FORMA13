import mongoose from 'mongoose';
import Income from '../models/income.model.js';
import Expense from '../models/expense.model.js';
import SalaryPayment from '../models/salaryPayment.model.js';
import ExpenseCategory from '../models/expenseCategory.model.js';
import FabricationJob from '../models/fabricationJob.model.js';

/**
 * Normalizes payment mode from Fabrication to Accounts accepted values
 */
const normalizePaymentMode = (mode) => {
  const m = String(mode || 'Cash').trim();
  if (/^upi$/i.test(m)) return 'UPI';
  if (/^cash$/i.test(m)) return 'Cash';
  if (/^bank transfer$/i.test(m) || /^bank$/i.test(m)) return 'Bank Transfer';
  if (/^cheque$/i.test(m)) return 'Cheque';
  if (/^credit/i.test(m)) return 'Credit/Pay Later';
  return 'Cash';
};

/**
 * 1. Sync Job Quotation & Client Payments to Income collection (Single Source of Truth)
 * Maps job quotation to the Sales Invoice and job.clientPayments to income.payments array.
 * This guarantees 1:1 payment matching in Income tab without double-counting.
 */
export const syncQuotationToSales = async (job) => {
  if (!job || job.jobId === 'FAB-GLOBAL-CONFIG') return null;

  try {
    const totalQuotation = Number(job.financials?.totalQuotation || 0);
    const totalReceived = Number(job.financials?.totalAmountReceived || 0);
    const balanceDue = Number(job.financials?.balanceDue !== undefined ? job.financials.balanceDue : (totalQuotation - totalReceived));

    let status = 'Pending';
    if (totalQuotation > 0 && totalReceived >= totalQuotation) {
      status = 'Paid';
    } else if (totalReceived > 0) {
      status = 'Partially Paid';
    }

    const lineItems = (job.quotationItems || []).map(item => ({
      description: item.description + (item.material ? ` (${item.material})` : ''),
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      amount: Number(item.amount) || 0
    }));

    // Map each client payment directly into income.payments subdocument array
    const payments = (job.clientPayments || []).map((p) => {
      const payMode = normalizePaymentMode(p.paymentMode);
      const recNo = p.transactionReference || `RCP-${job.jobId}-${String(p._id).slice(-4)}`;
      return {
        _id: p._id,
        receiptNo: recNo,
        receiptDate: p.date || new Date(),
        amount: Number(p.amount || 0),
        paymentMethod: payMode,
        notes: p.notes || (p.receivedBy ? `Received by: ${p.receivedBy}` : ''),
        createdAt: p.createdAt || p.date || new Date()
      };
    });

    // Clean up any legacy standalone direct receipts for this job to prevent double-counting
    await Income.deleteMany({
      'syncSource.module': 'Fabrication',
      'syncSource.fabricationJobId': job.jobId,
      'syncSource.fabricationItemId': { $ne: null }
    });

    // Find existing quotation sales record for this job
    let incomeRecord = await Income.findOne({
      'syncSource.module': 'Fabrication',
      'syncSource.fabricationJobId': job.jobId,
      'syncSource.fabricationItemId': null
    });

    const workDescription = (job.quotationItems && job.quotationItems.length > 0)
      ? job.quotationItems.map(item => item.description + (item.material ? ` (${item.material})` : '')).join(', ')
      : (job.jobTitle || `Fabrication: ${job.clientName}`);

    const incomeData = {
      title: workDescription,
      amount: Number(job.financials?.grossQuotation || totalQuotation),
      totalAmount: totalQuotation,
      receiptAmount: totalReceived,
      department: 'Fabrication',
      sourceType: 'Fabrication',
      client: job.client || null,
      clientName: job.clientName || 'Direct Client',
      referenceNo: job.jobId,
      orderNumber: job.jobId,
      date: job.startDate || job.createdAt || new Date(),
      status,
      isDirectReceipt: false,
      isDeleted: false,
      notes: job.notes || 'Auto-synced fabrication quotation',
      lineItems,
      discountAmount: Number(job.financials?.discountAmount || 0),
      payments,
      syncSource: {
        module: 'Fabrication',
        fabricationJobId: job.jobId,
        fabricationItemId: null,
        isAutoSynced: true
      }
    };

    if (incomeRecord) {
      Object.assign(incomeRecord, incomeData);
      incomeRecord.payments = payments;
      incomeRecord.markModified('payments');
      await incomeRecord.save();
    } else {
      incomeRecord = await Income.create(incomeData);
    }

    return incomeRecord;
  } catch (error) {
    console.error(`[FabricationAccountsSync] Error syncing quotation for ${job?.jobId}:`, error);
    return null;
  }
};

/**
 * 2. Sync Client Payment to Income (updates payments array on main invoice atomically)
 */
export const syncClientPaymentToIncome = async (job, payment) => {
  if (!job || job.jobId === 'FAB-GLOBAL-CONFIG') return null;
  return await syncQuotationToSales(job);
};

/**
 * Delete a client payment from Income collection (re-syncs payments array on main invoice)
 */
export const deleteClientPaymentFromIncome = async (paymentId, job) => {
  if (!job || job.jobId === 'FAB-GLOBAL-CONFIG') return null;
  return await syncQuotationToSales(job);
};

/**
 * 3. Sync Purchase or Operational Expense to Expense collection
 */
export const syncPurchaseOrExpense = async (job, item) => {
  if (!job || !item || job.jobId === 'FAB-GLOBAL-CONFIG') return null;

  try {
    const isPurchase = item.type === 'Purchase';
    const amount = Number(item.amount || 0);
    const payMode = normalizePaymentMode(item.paymentMode);

    // Resolve or find corresponding ExpenseCategory
    const targetCategoryName = item.category || (isPurchase ? 'Inventory & Purchase' : 'Maintenance');
    let categoryDoc = await ExpenseCategory.findOne({ name: { $regex: new RegExp(`^${targetCategoryName}$`, 'i') } });
    if (!categoryDoc && isPurchase) {
      categoryDoc = await ExpenseCategory.findOne({ name: { $regex: /purchase|inventory/i } });
    }

    let expenseRecord = await Expense.findOne({
      'syncSource.module': 'Fabrication',
      'syncSource.fabricationItemId': item._id
    });

    const expenseData = {
      date: item.date || new Date(),
      category: categoryDoc ? categoryDoc._id : null,
      categoryName: item.category || (isPurchase ? 'Fabrication Materials' : 'Fabrication Expenses'),
      isPurchase,
      type: isPurchase ? 'Purchase' : 'Expense',
      amount,
      totalAmount: amount,
      paymentMode: payMode,
      paidTo: item.vendorName || (isPurchase ? 'Material Vendor' : 'Service Provider'),
      description: `[${job.jobId}] ${item.itemDescription?.trim() || item.category || (isPurchase ? 'Material Purchase' : 'Operational Expense')}${item.billNumber ? ` (Bill #${item.billNumber})` : ''}`.trim(),
      attachment: item.receiptUrl || '',
      status: 'APPROVED',
      syncSource: {
        module: 'Fabrication',
        fabricationJobId: job.jobId,
        fabricationItemId: item._id,
        isAutoSynced: true
      }
    };

    if (expenseRecord) {
      Object.assign(expenseRecord, expenseData);
      await expenseRecord.save();
    } else {
      expenseRecord = await Expense.create(expenseData);
    }

    return expenseRecord;
  } catch (error) {
    console.error(`[FabricationAccountsSync] Error syncing purchase/expense ${item?._id} for ${job?.jobId}:`, error);
    return null;
  }
};

/**
 * Delete a purchase or operational expense from Expense collection
 */
export const deletePurchaseOrExpense = async (itemId) => {
  try {
    await Expense.findOneAndDelete({
      'syncSource.module': 'Fabrication',
      'syncSource.fabricationItemId': itemId
    });
  } catch (error) {
    console.error(`[FabricationAccountsSync] Error deleting expense for item ${itemId}:`, error);
  }
};

/**
 * 4. Sync Daily Wage to SalaryPayment & Expense collections
 */
export const syncWageToSalaryAndExpense = async (job, wage) => {
  if (!job || !wage || job.jobId === 'FAB-GLOBAL-CONFIG') return null;

  try {
    const totalWage = Number(wage.totalWage || 0);
    const wageDate = wage.date ? new Date(wage.date) : new Date();
    const resolvedMonth = wageDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // 1. Sync to SalaryPayment collection
    let salaryRecord = await SalaryPayment.findOne({
      'syncSource.module': 'Fabrication',
      'syncSource.fabricationItemId': wage._id
    });

    const salaryData = {
      employee: wage.employee || null,
      employeeName: wage.employeeName || 'Fabrication Worker',
      month: resolvedMonth,
      basicSalary: Number(wage.dailyRate || totalWage),
      paidAmount: totalWage,
      paymentDate: wageDate,
      paymentMode: 'Cash',
      department: 'Fabrication',
      designation: wage.shiftType ? `Fabrication Worker - ${wage.shiftType}` : 'Fabrication Worker',
      remarks: `Job: ${job.jobId} - ${wage.workDescription || ''}${wage.overtimeHours ? ` (OT: ${wage.overtimeHours} hrs)` : ''}`.trim(),
      status: 'COMPLETED',
      syncSource: {
        module: 'Fabrication',
        fabricationJobId: job.jobId,
        fabricationItemId: wage._id,
        isAutoSynced: true
      }
    };

    if (salaryRecord) {
      Object.assign(salaryRecord, salaryData);
      await salaryRecord.save();
    } else {
      salaryRecord = await SalaryPayment.create(salaryData);
    }

    // 2. Sync to Expense collection under "Salary" Category for Day Book / P&L
    let salaryCategory = await ExpenseCategory.findOne({ name: { $regex: /^Salary$/i } });

    let expenseRecord = await Expense.findOne({
      'syncSource.module': 'Fabrication',
      'syncSource.fabricationItemId': wage._id
    });

    const expenseData = {
      date: wageDate,
      category: salaryCategory ? salaryCategory._id : null,
      categoryName: 'Salary',
      isPurchase: false,
      type: 'Salary',
      amount: totalWage,
      totalAmount: totalWage,
      paymentMode: 'Cash',
      paidTo: wage.employeeName || 'Fabrication Worker',
      description: `Daily Wage: ${wage.employeeName} [${job.jobId}] - ${wage.workDescription || wage.shiftType || 'Work'}`.trim(),
      salaryPaymentId: salaryRecord._id,
      status: 'APPROVED',
      syncSource: {
        module: 'Fabrication',
        fabricationJobId: job.jobId,
        fabricationItemId: wage._id,
        isAutoSynced: true
      }
    };

    if (expenseRecord) {
      Object.assign(expenseRecord, expenseData);
      await expenseRecord.save();
    } else {
      expenseRecord = await Expense.create(expenseData);
    }

    return { salaryRecord, expenseRecord };
  } catch (error) {
    console.error(`[FabricationAccountsSync] Error syncing wage ${wage?._id} for ${job?.jobId}:`, error);
    return null;
  }
};

/**
 * Delete a daily wage from SalaryPayment & Expense collections
 */
export const deleteWageFromSalaryAndExpense = async (wageId) => {
  try {
    await SalaryPayment.findOneAndDelete({
      'syncSource.module': 'Fabrication',
      'syncSource.fabricationItemId': wageId
    });
    await Expense.findOneAndDelete({
      'syncSource.module': 'Fabrication',
      'syncSource.fabricationItemId': wageId
    });
  } catch (error) {
    console.error(`[FabricationAccountsSync] Error deleting salary/expense for wage ${wageId}:`, error);
  }
};

/**
 * 5. Clean up all synchronized records when a fabrication job is deleted
 */
export const deleteEntireJobFinancials = async (jobId) => {
  try {
    await Income.deleteMany({
      'syncSource.module': 'Fabrication',
      'syncSource.fabricationJobId': jobId
    });
    await Expense.deleteMany({
      'syncSource.module': 'Fabrication',
      'syncSource.fabricationJobId': jobId
    });
    await SalaryPayment.deleteMany({
      'syncSource.module': 'Fabrication',
      'syncSource.fabricationJobId': jobId
    });
    console.log(`[FabricationAccountsSync] Cleaned up all accounts records for job ${jobId}`);
  } catch (error) {
    console.error(`[FabricationAccountsSync] Error cleaning up financials for job ${jobId}:`, error);
  }
};

/**
 * 6. Sync an entire job (Quotation, Client Payments, Purchases, Wages)
 */
export const syncEntireJob = async (job) => {
  if (!job || job.jobId === 'FAB-GLOBAL-CONFIG') return null;

  try {
    // 1. Sync Quotation & all Client Payments into single Income document
    await syncQuotationToSales(job);

    // 2. Sync all Purchases & Expenses
    if (Array.isArray(job.purchasesAndExpenses)) {
      for (const item of job.purchasesAndExpenses) {
        await syncPurchaseOrExpense(job, item);
      }
    }

    // 3. Sync all Daily Wages
    if (Array.isArray(job.dailyWages)) {
      for (const wage of job.dailyWages) {
        await syncWageToSalaryAndExpense(job, wage);
      }
    }

    return true;
  } catch (error) {
    console.error(`[FabricationAccountsSync] Error syncing entire job ${job?.jobId}:`, error);
    return false;
  }
};

/**
 * 7. Bulk Retroactive Sync for all existing customer fabrication jobs
 */
export const syncAllJobsToAccounts = async () => {
  try {
    const jobs = await FabricationJob.find({ jobId: { $ne: 'FAB-GLOBAL-CONFIG' } });
    console.log(`[FabricationAccountsSync] Starting sync for ${jobs.length} fabrication jobs...`);

    let syncedCount = 0;
    for (const job of jobs) {
      await syncEntireJob(job);
      syncedCount++;
    }

    console.log(`[FabricationAccountsSync] Successfully synced ${syncedCount} fabrication jobs to Accounts.`);
    return { success: true, totalJobs: jobs.length, syncedCount };
  } catch (error) {
    console.error('[FabricationAccountsSync] Error in syncAllJobsToAccounts:', error);
    return { success: false, error: error.message };
  }
};
