import FabricationJob from '../models/fabricationJob.model.js';
import User from '../models/user.model.js';
import Client from '../models/client.model.js';

// Generate incremental Job ID like FAB-2026-0001
const generateJobId = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `FAB-${currentYear}-`;
  const count = await FabricationJob.countDocuments({
    jobId: new RegExp(`^${prefix}`)
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

// 1. Get all fabrication jobs with filters & top metrics
export const getFabricationJobs = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;

    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { jobId: { $regex: s, $options: 'i' } },
        { jobTitle: { $regex: s, $options: 'i' } },
        { clientName: { $regex: s, $options: 'i' } },
        { clientPhone: { $regex: s, $options: 'i' } },
        { siteAddress: { $regex: s, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [jobs, totalCount, allJobsForMetrics] = await Promise.all([
      FabricationJob.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      FabricationJob.countDocuments(query),
      FabricationJob.find({}, 'status financials').lean()
    ]);

    // Aggregate overall KPI metrics across all jobs
    const metrics = allJobsForMetrics.reduce((acc, job) => {
      const f = job.financials || {};
      acc.totalJobs += 1;
      if (job.status === 'Confirmed / In Progress') acc.activeJobs += 1;
      if (job.status === 'Completed') acc.completedJobs += 1;
      acc.totalQuoted += (f.totalQuotation || 0);
      acc.totalReceived += (f.totalAmountReceived || 0);
      acc.totalDirectCost += (f.totalDirectCost || 0);
      acc.totalBalanceDue += (f.balanceDue || 0);
      acc.totalNetProfit += (f.netProfit || 0);
      return acc;
    }, {
      totalJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      totalQuoted: 0,
      totalReceived: 0,
      totalDirectCost: 0,
      totalBalanceDue: 0,
      totalNetProfit: 0
    });

    return res.status(200).json({
      success: true,
      data: {
        jobs,
        pagination: {
          total: totalCount,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(totalCount / parseInt(limit, 10))
        },
        metrics
      }
    });
  } catch (error) {
    console.error('Error fetching fabrication jobs:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch fabrication jobs'
    });
  }
};

// 2. Get single fabrication job by ID
export const getFabricationJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await FabricationJob.findById(id)
      .populate('client', 'companyName clientName phone email address')
      .populate('dailyWages.employee', 'name email designation phone');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Fabrication job not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error fetching fabrication job:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch fabrication job'
    });
  }
};

// 2.1 Get or Create dedicated fabrication job for a Client (Single-Page flow)
export const getOrCreateClientJob = async (req, res) => {
  try {
    const { clientId } = req.params;
    let clientDoc = null;
    try {
      clientDoc = await Client.findById(clientId);
    } catch (_) {}

    const clientName = clientDoc ? (clientDoc.clientName || clientDoc.companyName || '') : '';

    const queryOr = [{ client: clientId }];
    if (clientName && clientName.trim()) {
      queryOr.push({ clientName: new RegExp(`^${clientName.trim()}$`, 'i') });
    }

    let job = await FabricationJob.findOne({ $or: queryOr })
      .populate('client', 'companyName clientName phone email address')
      .populate('dailyWages.employee', 'name email designation phone');

    if (!job) {
      const jobId = await generateJobId();
      job = new FabricationJob({
        jobId,
        jobTitle: clientName ? `${clientName} - Fabrication & Works` : 'Fabrication & Job Works',
        client: clientDoc ? clientDoc._id : (clientId.length === 24 ? clientId : undefined),
        clientName: clientName || 'Client',
        clientPhone: clientDoc?.phone || '',
        clientEmail: clientDoc?.email || '',
        siteAddress: clientDoc?.address || '',
        status: 'Confirmed / In Progress',
        startDate: new Date(),
        quotationItems: [],
        dailyWages: [],
        purchasesAndExpenses: [],
        clientPayments: [],
        createdBy: req.user?._id || undefined
      });
      await job.save();
    }

    return res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error in getOrCreateClientJob:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get or create client job'
    });
  }
};

// 3. Create a new fabrication job
export const createFabricationJob = async (req, res) => {
  try {
    const {
      jobTitle,
      client,
      clientName,
      clientPhone,
      clientEmail,
      siteAddress,
      status,
      startDate,
      deliveryDate,
      notes
    } = req.body;

    if (!clientName) {
      return res.status(400).json({
        success: false,
        message: 'Client name is required.'
      });
    }

    const jobId = await generateJobId();

    const newJob = new FabricationJob({
      jobId,
      jobTitle: jobTitle ? String(jobTitle).trim() : '',
      client: client || undefined,
      clientName,
      clientPhone: clientPhone || '',
      clientEmail: clientEmail || '',
      siteAddress: siteAddress || '',
      status: status || 'Quotation Stage',
      startDate: startDate || new Date(),
      deliveryDate: deliveryDate || undefined,
      notes: notes || '',
      createdBy: req.user?._id || undefined
    });

    await newJob.save();

    return res.status(201).json({
      success: true,
      message: 'Fabrication job created successfully',
      data: newJob
    });
  } catch (error) {
    console.error('Error creating fabrication job:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create fabrication job'
    });
  }
};

// 4. Update core job details
export const updateFabricationJob = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      jobTitle,
      client,
      clientName,
      clientPhone,
      clientEmail,
      siteAddress,
      status,
      startDate,
      deliveryDate,
      notes
    } = req.body;

    const job = await FabricationJob.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Fabrication job not found'
      });
    }

    if (jobTitle !== undefined) job.jobTitle = String(jobTitle || '').trim();
    if (client !== undefined) job.client = client || null;
    if (clientName !== undefined) job.clientName = clientName;
    if (clientPhone !== undefined) job.clientPhone = clientPhone;
    if (clientEmail !== undefined) job.clientEmail = clientEmail;
    if (siteAddress !== undefined) job.siteAddress = siteAddress;
    if (status !== undefined) job.status = status;
    if (startDate !== undefined) job.startDate = startDate;
    if (deliveryDate !== undefined) job.deliveryDate = deliveryDate;
    if (notes !== undefined) job.notes = notes;
    if (req.body.quotationDiscount !== undefined) job.quotationDiscount = req.body.quotationDiscount;
    job.updatedBy = req.user?._id || undefined;

    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Fabrication job updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Error updating fabrication job:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update fabrication job'
    });
  }
};

// 5. Delete entire fabrication job
export const deleteFabricationJob = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await FabricationJob.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Fabrication job not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Fabrication job deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting fabrication job:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete fabrication job'
    });
  }
};

// ==========================================
// 6. QUOTATION ITEMS CRUD
// ==========================================
export const addQuotationItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      description, 
      material = '',
      quantity = 1, 
      unit = 'Nos', 
      unitPrice = 0, 
      discountType = 'fixed',
      discountValue = 0,
      amount, 
      notes = '' 
    } = req.body;

    if (!description) {
      return res.status(400).json({ success: false, message: 'Item description is required' });
    }

    const job = await FabricationJob.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Fabrication job not found' });
    }

    const qty = Number(quantity) || 1;
    const price = Number(unitPrice) || 0;
    const gross = qty * price;
    const discVal = Number(discountValue) || 0;
    const discAmt = discountType === 'percentage' ? (gross * discVal) / 100 : discVal;
    const calcAmount = amount !== undefined && amount !== null && amount !== '' 
      ? Number(amount) 
      : Math.max(0, gross - discAmt);

    job.quotationItems.push({
      description,
      material: String(material || '').trim(),
      quantity: qty,
      unit,
      unitPrice: price,
      discountType,
      discountValue: discVal,
      discountAmount: Math.round(discAmt * 100) / 100,
      amount: Math.round(calcAmount * 100) / 100,
      notes
    });

    await job.save();

    return res.status(201).json({
      success: true,
      message: 'Quotation item added successfully',
      data: job
    });
  } catch (error) {
    console.error('Error adding quotation item:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateQuotationItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { description, material, quantity, unit, unitPrice, discountType, discountValue, amount, notes } = req.body;

    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    const item = job.quotationItems.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Quotation item not found' });

    if (description !== undefined) item.description = description;
    if (material !== undefined) item.material = String(material || '').trim();
    if (quantity !== undefined) item.quantity = Number(quantity);
    if (unit !== undefined) item.unit = unit;
    if (unitPrice !== undefined) item.unitPrice = Number(unitPrice);
    if (discountType !== undefined) item.discountType = discountType;
    if (discountValue !== undefined) item.discountValue = Number(discountValue);
    if (notes !== undefined) item.notes = notes;

    if (amount !== undefined && amount !== null && amount !== '') {
      item.amount = Number(amount);
    } else {
      const gross = (item.quantity ?? 1) * (item.unitPrice ?? 0);
      const dType = item.discountType || 'fixed';
      const dVal = Number(item.discountValue) || 0;
      const dAmt = dType === 'percentage' ? (gross * dVal) / 100 : dVal;
      item.discountAmount = Math.round(dAmt * 100) / 100;
      item.amount = Math.max(0, Math.round((gross - dAmt) * 100) / 100);
    }

    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Quotation item updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Error updating quotation item:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateQuotationDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'fixed', value = 0 } = req.body;

    const job = await FabricationJob.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Fabrication job not found' });
    }

    job.quotationDiscount = {
      type: type === 'percentage' ? 'percentage' : 'fixed',
      value: Math.max(0, Number(value) || 0),
      amount: 0
    };

    job.updatedBy = req.user?._id || undefined;
    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Quotation discount updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Error updating quotation discount:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteQuotationItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    job.quotationItems.pull(itemId);
    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Quotation item deleted successfully',
      data: job
    });
  } catch (error) {
    console.error('Error deleting quotation item:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 7. DAILY WAGES CRUD (Employee Selection & Date Picker)
// ==========================================
export const addDailyWage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      employee,
      employeeName,
      workDescription,
      shiftType = 'Full Day',
      dailyRate = 0,
      overtimeHours = 0,
      overtimeRate = 0,
      totalWage,
      notes = ''
    } = req.body;

    if (!employeeName) {
      return res.status(400).json({ success: false, message: 'Employee name is required' });
    }

    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    const calcWage = (totalWage !== undefined && totalWage !== null && totalWage !== '')
      ? Number(totalWage)
      : (Number(dailyRate) + (Number(overtimeHours) * Number(overtimeRate)));

    job.dailyWages.push({
      date: date ? new Date(date) : new Date(),
      employee: employee || undefined,
      employeeName,
      workDescription: workDescription || '',
      shiftType,
      dailyRate: Number(dailyRate) || 0,
      overtimeHours: Number(overtimeHours) || 0,
      overtimeRate: Number(overtimeRate) || 0,
      totalWage: calcWage,
      notes
    });

    await job.save();

    return res.status(201).json({
      success: true,
      message: 'Daily wage logged successfully',
      data: job
    });
  } catch (error) {
    console.error('Error adding daily wage:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDailyWage = async (req, res) => {
  try {
    const { id, wageId } = req.params;
    const {
      date,
      employee,
      employeeName,
      workDescription,
      shiftType,
      dailyRate,
      overtimeHours,
      overtimeRate,
      totalWage,
      notes
    } = req.body;

    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    const wage = job.dailyWages.id(wageId);
    if (!wage) return res.status(404).json({ success: false, message: 'Daily wage record not found' });

    if (date !== undefined) wage.date = new Date(date);
    if (employee !== undefined) wage.employee = employee || undefined;
    if (employeeName !== undefined) wage.employeeName = employeeName;
    if (workDescription !== undefined) wage.workDescription = workDescription;
    if (shiftType !== undefined) wage.shiftType = shiftType;
    if (dailyRate !== undefined) wage.dailyRate = Number(dailyRate);
    if (overtimeHours !== undefined) wage.overtimeHours = Number(overtimeHours);
    if (overtimeRate !== undefined) wage.overtimeRate = Number(overtimeRate);
    if (notes !== undefined) wage.notes = notes;

    if (totalWage !== undefined && totalWage !== null && totalWage !== '') {
      wage.totalWage = Number(totalWage);
    } else if (dailyRate !== undefined || overtimeHours !== undefined || overtimeRate !== undefined) {
      wage.totalWage = wage.dailyRate + (wage.overtimeHours * wage.overtimeRate);
    }

    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Daily wage record updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Error updating daily wage:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDailyWage = async (req, res) => {
  try {
    const { id, wageId } = req.params;
    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    job.dailyWages.pull(wageId);
    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Daily wage record deleted successfully',
      data: job
    });
  } catch (error) {
    console.error('Error deleting daily wage:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 8. PURCHASES & EXPENSES CRUD
// Dropdown for Sq.Ft/Inches/etc., Rate, Quantity, Auto-Calculate Total
// ==========================================
export const addPurchaseExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      type = 'Purchase',
      category = 'Raw Material',
      itemDescription,
      vendorName = '',
      billNumber = '',
      quantity = 1,
      unit = 'Nos',
      rate = 0,
      amount,
      paymentMode = 'Cash',
      receiptUrl = '',
      notes = ''
    } = req.body;

    let finalDescription = (itemDescription || '').trim();
    if (!finalDescription) {
      if (type === 'Expense') {
        finalDescription = (notes || '').trim() || category || 'Site Operational Expense';
      } else {
        return res.status(400).json({ success: false, message: 'Item description is required' });
      }
    }

    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    // Auto-calculate amount if not explicitly provided: quantity * rate
    const calcAmount = (amount !== undefined && amount !== null && amount !== '')
      ? Number(amount)
      : (Number(quantity) * Number(rate));

    job.purchasesAndExpenses.push({
      date: date ? new Date(date) : new Date(),
      type,
      category,
      itemDescription: finalDescription,
      vendorName,
      billNumber,
      quantity: Number(quantity) || 1,
      unit,
      rate: Number(rate) || 0,
      amount: calcAmount,
      paymentMode,
      receiptUrl,
      notes
    });

    await job.save();

    return res.status(201).json({
      success: true,
      message: `${type} entry logged successfully`,
      data: job
    });
  } catch (error) {
    console.error('Error adding purchase/expense:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePurchaseExpense = async (req, res) => {
  try {
    const { id, expenseId } = req.params;
    const {
      date,
      type,
      category,
      itemDescription,
      vendorName,
      billNumber,
      quantity,
      unit,
      rate,
      amount,
      paymentMode,
      receiptUrl,
      notes
    } = req.body;

    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    const entry = job.purchasesAndExpenses.id(expenseId);
    if (!entry) return res.status(404).json({ success: false, message: 'Expense entry not found' });

    if (date !== undefined) entry.date = new Date(date);
    if (type !== undefined) entry.type = type;
    if (category !== undefined) entry.category = category;
    if (itemDescription !== undefined) entry.itemDescription = itemDescription;
    if (vendorName !== undefined) entry.vendorName = vendorName;
    if (billNumber !== undefined) entry.billNumber = billNumber;
    if (quantity !== undefined) entry.quantity = Number(quantity);
    if (unit !== undefined) entry.unit = unit;
    if (rate !== undefined) entry.rate = Number(rate);
    if (paymentMode !== undefined) entry.paymentMode = paymentMode;
    if (receiptUrl !== undefined) entry.receiptUrl = receiptUrl;
    if (notes !== undefined) entry.notes = notes;

    if (amount !== undefined && amount !== null && amount !== '') {
      entry.amount = Number(amount);
    } else if (quantity !== undefined || rate !== undefined) {
      entry.amount = entry.quantity * entry.rate;
    }

    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Expense entry updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Error updating purchase/expense:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePurchaseExpense = async (req, res) => {
  try {
    const { id, expenseId } = req.params;
    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    job.purchasesAndExpenses.pull(expenseId);
    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Expense entry deleted successfully',
      data: job
    });
  } catch (error) {
    console.error('Error deleting purchase/expense:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 9. CLIENT PAYMENTS CRUD ("Amount Given")
// ==========================================
export const addClientPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      amount,
      paymentMode = 'Cash',
      transactionReference = '',
      receivedBy = '',
      notes = ''
    } = req.body;

    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ success: false, message: 'Payment amount is required' });
    }

    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    job.clientPayments.push({
      date: date ? new Date(date) : new Date(),
      amount: Number(amount) || 0,
      paymentMode,
      transactionReference,
      receivedBy: receivedBy || (req.user?.name || ''),
      notes
    });

    await job.save();

    return res.status(201).json({
      success: true,
      message: 'Client payment recorded successfully',
      data: job
    });
  } catch (error) {
    console.error('Error adding client payment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateClientPayment = async (req, res) => {
  try {
    const { id, paymentId } = req.params;
    const { date, amount, paymentMode, transactionReference, receivedBy, notes } = req.body;

    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    const payment = job.clientPayments.id(paymentId);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });

    if (date !== undefined) payment.date = new Date(date);
    if (amount !== undefined) payment.amount = Number(amount);
    if (paymentMode !== undefined) payment.paymentMode = paymentMode;
    if (transactionReference !== undefined) payment.transactionReference = transactionReference;
    if (receivedBy !== undefined) payment.receivedBy = receivedBy;
    if (notes !== undefined) payment.notes = notes;

    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Client payment updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Error updating client payment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteClientPayment = async (req, res) => {
  try {
    const { id, paymentId } = req.params;
    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    job.clientPayments.pull(paymentId);
    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Client payment deleted successfully',
      data: job
    });
  } catch (error) {
    console.error('Error deleting client payment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
