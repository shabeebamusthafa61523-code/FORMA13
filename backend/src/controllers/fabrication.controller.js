import {
  syncQuotationToSales,
  syncClientPaymentToIncome,
  deleteClientPaymentFromIncome,
  syncPurchaseOrExpense,
  deletePurchaseOrExpense,
  syncWageToSalaryAndExpense,
  deleteWageFromSalaryAndExpense,
  deleteEntireJobFinancials,
  syncEntireJob,
  syncAllJobsToAccounts
} from '../services/fabricationAccountsSync.service.js';
import FabricationJob from '../models/fabricationJob.model.js';
import User from '../models/user.model.js';
import Client from '../models/client.model.js';
import QuotationTerm from '../models/quotationTerm.model.js';
import FabricationMaterial from '../models/fabricationMaterial.model.js';
import FabricationWorkScope from '../models/fabricationWorkScope.model.js';
import FabricationItemPreset from '../models/fabricationItemPreset.model.js';
import Vendor from '../models/vendor.model.js';
import ExpenseCategory from '../models/expenseCategory.model.js';

export const DEFAULT_INVOICE_TERMS = [
  { text: '50% advance payment required with confirmed work order to procure raw materials.', enabled: true, order: 1, isDefault: true },
  { text: 'Balance payable upon delivery / site erection completion and final inspection.', enabled: true, order: 2, isDefault: true },
  { text: 'Extra scope, design alterations or dimensions beyond quoted measurements will be billed extra.', enabled: true, order: 3, isDefault: true },
  { text: 'GST & taxes applicable as per standard government tax rates.', enabled: true, order: 4, isDefault: true },
  { text: 'Delivery & installation timeline: within 10–15 business days from advance confirmation.', enabled: false, order: 5, isDefault: true },
  { text: 'Electricity & site water supply for installation to be provided by client.', enabled: false, order: 6, isDefault: true }
];

export const DEFAULT_FABRICATION_MATERIALS = [
  { name: 'Mild Steel (MS)', order: 1, isDefault: true },
  { name: 'Stainless Steel (SS 304)', order: 2, isDefault: true },
  { name: 'Stainless Steel (SS 316)', order: 3, isDefault: true },
  { name: 'Galvanized Iron (GI)', order: 4, isDefault: true },
  { name: 'Aluminum', order: 5, isDefault: true },
  { name: 'Cast Iron', order: 6, isDefault: true },
  { name: 'Structural Steel (IS 2062)', order: 7, isDefault: true },
  { name: 'Carbon Steel', order: 8, isDefault: true },
  { name: 'Brass', order: 9, isDefault: true },
  { name: 'Copper', order: 10, isDefault: true },
  { name: 'Wrought Iron', order: 11, isDefault: true },
  { name: 'Sheet Metal', order: 12, isDefault: true }
];

export const DEFAULT_WORK_SCOPE_DESCRIPTIONS = [
  { title: 'Main Gate MS Tubular Frame with CNC Laser Sheet Design', defaultUnit: 'Nos', order: 1, isDefault: true },
  { title: 'Sliding Main Gate with Heavy Duty Track & Roller Wheels', defaultUnit: 'Nos', order: 2, isDefault: true },
  { title: 'Stainless Steel (SS 304) Staircase Railing with Toughened Glass', defaultUnit: 'Feet', order: 3, isDefault: true },
  { title: 'MS Window Safety Grill with Primer & Enamel Coating', defaultUnit: 'Sq.Ft', order: 4, isDefault: true },
  { title: 'Industrial Truss Roofing with Color Coated Sheets', defaultUnit: 'Sq.Ft', order: 5, isDefault: true },
  { title: 'Spiral Staircase with Checker Plate Steps & Handrail', defaultUnit: 'Nos', order: 6, isDefault: true },
  { title: 'Balcony Safety Railing with Glass Clamps', defaultUnit: 'Feet', order: 7, isDefault: true },
  { title: 'Heavy Duty Rolling Shutter with Spring & Pulley System', defaultUnit: 'Sq.Ft', order: 8, isDefault: true },
  { title: 'Compound Wall Security Spikes & Chainlink Fencing', defaultUnit: 'Feet', order: 9, isDefault: true },
  { title: 'Portico Canopy / Shed with Polycarbonate Roofing Sheet', defaultUnit: 'Sq.Ft', order: 10, isDefault: true },
  { title: 'Structural Steel Mezzanine Floor with I-Beam Columns', defaultUnit: 'Sq.Ft', order: 11, isDefault: true },
  { title: 'Fire Exit Heavy Duty Steel Single Door with Push Bar', defaultUnit: 'Nos', order: 12, isDefault: true },
  { title: 'MS Pergola / Gazebo Structure with Powder Coating', defaultUnit: 'Nos', order: 13, isDefault: true },
  { title: 'Rolling Shutter Grill with Motorized Drive Option', defaultUnit: 'Sq.Ft', order: 14, isDefault: true },
  { title: 'Steel Water Tank Overhead Support Stand Structure', defaultUnit: 'Nos', order: 15, isDefault: true }
];

export const DEFAULT_ITEM_PRESETS = [
  { description: 'MS Square Pipe 2x2 inch (16 gauge)', category: 'Raw Material', defaultUnit: 'Lengths', order: 1, isDefault: true },
  { description: 'MS Round Pipe 1.5 inch', category: 'Raw Material', defaultUnit: 'Lengths', order: 2, isDefault: true },
  { description: 'CR Sheet 1.2mm (8x4 ft)', category: 'Plates & Sheets', defaultUnit: 'Nos', order: 3, isDefault: true },
  { description: 'HR Sheet 2mm (8x4 ft)', category: 'Plates & Sheets', defaultUnit: 'Nos', order: 4, isDefault: true },
  { description: 'MS Flat 50x6 mm', category: 'Raw Material', defaultUnit: 'Lengths', order: 5, isDefault: true },
  { description: 'MS Angle 40x40x5 mm', category: 'Raw Material', defaultUnit: 'Lengths', order: 6, isDefault: true },
  { description: 'Welding Electrodes 6013 (ESAB / Advani)', category: 'Consumables', defaultUnit: 'Box', order: 7, isDefault: true },
  { description: 'Cutting Wheels 4 inch & 14 inch', category: 'Consumables', defaultUnit: 'Nos', order: 8, isDefault: true },
  { description: 'Grinding Wheels 4 inch', category: 'Consumables', defaultUnit: 'Nos', order: 9, isDefault: true },
  { description: 'Industrial Oxygen Cylinder Refill', category: 'Industrial Gas', defaultUnit: 'Nos', order: 10, isDefault: true },
  { description: 'Industrial CO2 / Argon Gas Cylinder Refill', category: 'Industrial Gas', defaultUnit: 'Nos', order: 11, isDefault: true },
  { description: 'Fasteners & Anchor Bolts (10mm/12mm)', category: 'Hardware', defaultUnit: 'Box', order: 12, isDefault: true },
  { description: 'Red Oxide Primer (20 Litres)', category: 'Paints & Coating', defaultUnit: 'Litres', order: 13, isDefault: true },
  { description: 'Epoxy Primer & Thinner', category: 'Paints & Coating', defaultUnit: 'Litres', order: 14, isDefault: true },
  { description: 'Crane & Loading Charges', category: 'Transport & Freight', defaultUnit: 'Lumpsum', order: 15, isDefault: true }
];

export const DEFAULT_FABRICATION_UNITS = [
  { name: 'Sq.Ft', order: 1, isDefault: true },
  { name: 'Inches', order: 2, isDefault: true },
  { name: 'Feet', order: 3, isDefault: true },
  { name: 'Kg', order: 4, isDefault: true },
  { name: 'Nos', order: 5, isDefault: true },
  { name: 'Lengths', order: 6, isDefault: true },
  { name: 'Meters', order: 7, isDefault: true },
  { name: 'Tons', order: 8, isDefault: true },
  { name: 'Box', order: 9, isDefault: true },
  { name: 'Litres', order: 10, isDefault: true },
  { name: 'Lumpsum', order: 11, isDefault: true },
  { name: 'Hours', order: 12, isDefault: true },
  { name: 'Days', order: 13, isDefault: true }
];

export const DEFAULT_FABRICATION_VENDORS = [
  { name: 'Jindal Steel Distributors', phone: '9845012345', notes: 'Raw steel & pipes' },
  { name: 'Tata Steel Yard', phone: '9845067890', notes: 'Plates & sheets' },
  { name: 'Krishna Steels & Hardware', phone: '9845054321', notes: 'Structural MS & hardware' },
  { name: 'National Industrial Gas Agency', phone: '9845098765', notes: 'Oxygen & CO2 cylinders' },
  { name: 'Sai Welding Consumables & Tools', phone: '9845011223', notes: 'Welding rods & cutting wheels' },
  { name: 'Bhavani Paints & Coatings', phone: '9845033445', notes: 'Red oxide primer & thinners' }
];

export const DEFAULT_FABRICATION_EXPENSE_CATEGORIES = [
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

    const query = { jobId: { $nin: ['FAB-GLOBAL-CONFIG', 'FAB-CONFIG-MASTER'] } };

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
      FabricationJob.find({ jobId: { $nin: ['FAB-GLOBAL-CONFIG', 'FAB-CONFIG-MASTER'] } }, 'status financials').lean()
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
    try { await syncQuotationToSales(newJob); } catch (e) { console.error("Sync error:", e); }

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
    if (req.body.terms !== undefined) job.terms = req.body.terms;
    if (req.body.quotationDiscount !== undefined) job.quotationDiscount = req.body.quotationDiscount;
    job.updatedBy = req.user?._id || undefined;

    await job.save();
    try { await syncQuotationToSales(job); } catch (e) { console.error("Sync error:", e); }

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

    try { await deleteEntireJobFinancials(deleted.jobId); } catch (e) { console.error("Sync error:", e); }

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
const recalculateQuotationItemAmount = (item) => {
  const qty = Number(item.quantity) || 1;
  const price = Number(item.unitPrice) || 0;
  const gross = qty * price;
  const dType = item.discountType || 'fixed';
  const dVal = Number(item.discountValue) || 0;
  const dAmt = dType === 'percentage' ? (gross * dVal) / 100 : dVal;
  const baseAmount = Math.max(0, gross - dAmt);
  const subSum = (item.subItems || []).reduce((acc, s) => acc + (Number(s.price) || 0), 0);
  item.amount = Math.round((baseAmount + subSum) * 100) / 100;
  return item.amount;
};

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
      notes = '',
      subItems = []
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
    const baseAmount = Math.max(0, gross - discAmt);

    const formattedSubItems = Array.isArray(subItems) ? subItems.map(s => {
      const sQty = Number(s.quantity) || 1;
      const sRate = Number(s.unitPrice) || 0;
      const sPrice = s.price !== undefined && s.price !== null && s.price !== '' 
        ? Number(s.price) 
        : (sQty * sRate);
      return {
        title: String(s.title || '').trim(),
        quantity: sQty,
        unit: String(s.unit || 'Nos').trim(),
        unitPrice: sRate,
        price: sPrice,
        notes: String(s.notes || '').trim()
      };
    }).filter(s => s.title) : [];

    const subSum = formattedSubItems.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
    const finalAmount = Math.round((baseAmount + subSum) * 100) / 100;

    job.quotationItems.push({
      description,
      material: String(material || '').trim(),
      quantity: qty,
      unit,
      unitPrice: price,
      discountType,
      discountValue: discVal,
      discountAmount: Math.round(discAmt * 100) / 100,
      amount: finalAmount,
      notes,
      subItems: formattedSubItems
    });

    await job.save();
    try { await syncQuotationToSales(job); } catch (e) { console.error("Sync error:", e); }

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
    const { description, material, quantity, unit, unitPrice, discountType, discountValue, amount, notes, subItems } = req.body;

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

    if (Array.isArray(subItems)) {
      item.subItems = subItems.map(s => {
        const sQty = Number(s.quantity) || 1;
        const sRate = Number(s.unitPrice) || 0;
        const sPrice = s.price !== undefined && s.price !== null && s.price !== '' 
          ? Number(s.price) 
          : (sQty * sRate);
        const subObj = {
          title: String(s.title || '').trim(),
          quantity: sQty,
          unit: String(s.unit || 'Nos').trim(),
          unitPrice: sRate,
          price: sPrice,
          notes: String(s.notes || '').trim()
        };
        if (s._id) subObj._id = s._id;
        return subObj;
      }).filter(s => s.title);
    }

    recalculateQuotationItemAmount(item);

    await job.save();
    try { await syncQuotationToSales(job); } catch (e) { console.error("Sync error:", e); }

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
    try { await syncQuotationToSales(job); } catch (e) { console.error("Sync error:", e); }

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
    try { await syncQuotationToSales(job); } catch (e) { console.error("Sync error:", e); }

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

// Sub-items operations
export const addQuotationSubItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { title, quantity = 1, unit = 'Nos', unitPrice = 0, price, notes = '' } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Sub-item title is required' });
    }

    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    const item = job.quotationItems.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Quotation item not found' });

    if (!item.subItems) item.subItems = [];

    const sQty = Number(quantity) || 1;
    const sRate = Number(unitPrice) || 0;
    const sPrice = price !== undefined && price !== null && price !== '' 
      ? Number(price) 
      : (sQty * sRate);

    item.subItems.push({
      title: String(title).trim(),
      quantity: sQty,
      unit: String(unit || 'Nos').trim(),
      unitPrice: sRate,
      price: sPrice,
      notes: String(notes || '').trim()
    });

    // Auto-update parent item amount by adding sum of sub-items to base item price
    recalculateQuotationItemAmount(item);

    await job.save();
    try { await syncQuotationToSales(job); } catch (e) { console.error("Sync error:", e); }

    return res.status(201).json({
      success: true,
      message: 'Sub-item added successfully',
      data: job
    });
  } catch (error) {
    console.error('Error adding quotation sub-item:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateQuotationSubItem = async (req, res) => {
  try {
    const { id, itemId, subId } = req.params;
    const { title, quantity, unit, unitPrice, price, notes } = req.body;

    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    const item = job.quotationItems.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Quotation item not found' });

    const subItem = item.subItems.id(subId);
    if (!subItem) return res.status(404).json({ success: false, message: 'Sub-item not found' });

    if (title !== undefined) subItem.title = String(title).trim();
    if (quantity !== undefined) subItem.quantity = Number(quantity);
    if (unit !== undefined) subItem.unit = String(unit).trim();
    if (unitPrice !== undefined) subItem.unitPrice = Number(unitPrice);
    if (notes !== undefined) subItem.notes = String(notes).trim();

    if (price !== undefined && price !== null && price !== '') {
      subItem.price = Number(price);
    } else if (quantity !== undefined || unitPrice !== undefined) {
      subItem.price = (subItem.quantity || 1) * (subItem.unitPrice || 0);
    }

    // Auto-update parent item amount by adding sum of sub-items to base item price
    recalculateQuotationItemAmount(item);

    await job.save();
    try { await syncQuotationToSales(job); } catch (e) { console.error("Sync error:", e); }

    return res.status(200).json({
      success: true,
      message: 'Sub-item updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Error updating quotation sub-item:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteQuotationSubItem = async (req, res) => {
  try {
    const { id, itemId, subId } = req.params;
    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });

    const item = job.quotationItems.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Quotation item not found' });

    item.subItems.pull(subId);

    // Auto-update parent item amount by adding sum of remaining sub-items to base item price
    recalculateQuotationItemAmount(item);

    await job.save();
    try { await syncQuotationToSales(job); } catch (e) { console.error("Sync error:", e); }

    return res.status(200).json({
      success: true,
      message: 'Sub-item deleted successfully',
      data: job
    });
  } catch (error) {
    console.error('Error deleting quotation sub-item:', error);
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
    try {
      const addedWage = job.dailyWages[job.dailyWages.length - 1];
      await syncWageToSalaryAndExpense(job, addedWage);
    } catch (e) { console.error("Sync error:", e); }

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
    try {
      const updatedWage = job.dailyWages.id(wageId);
      await syncWageToSalaryAndExpense(job, updatedWage);
    } catch (e) { console.error("Sync error:", e); }

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
    try { await deleteWageFromSalaryAndExpense(wageId); } catch (e) { console.error("Sync error:", e); }

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
      quantity: (quantity !== undefined && quantity !== null && quantity !== '') ? Number(quantity) : 0,
      unit,
      rate: Number(rate) || 0,
      amount: calcAmount,
      paymentMode,
      receiptUrl,
      notes
    });

    await job.save();
    try {
      const addedItem = job.purchasesAndExpenses[job.purchasesAndExpenses.length - 1];
      await syncPurchaseOrExpense(job, addedItem);
    } catch (e) { console.error("Sync error:", e); }

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
    if (itemDescription !== undefined) entry.itemDescription = (itemDescription || "").trim();
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
    try {
      const updatedItem = job.purchasesAndExpenses.id(expenseId);
      await syncPurchaseOrExpense(job, updatedItem);
    } catch (e) { console.error("Sync error:", e); }

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
    try { await deletePurchaseOrExpense(expenseId); } catch (e) { console.error("Sync error:", e); }

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
    try {
      const addedPayment = job.clientPayments[job.clientPayments.length - 1];
      await syncClientPaymentToIncome(job, addedPayment);
    } catch (e) { console.error("Sync error:", e); }

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
    try {
      const updatedPayment = job.clientPayments.id(paymentId);
      await syncClientPaymentToIncome(job, updatedPayment);
    } catch (e) { console.error("Sync error:", e); }

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
    try { await deleteClientPaymentFromIncome(paymentId, job); } catch (e) { console.error("Sync error:", e); }

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

// =========================================================================
// Master Fabrication Catalog Store (MongoDB backed inside fabricationjobs)
// =========================================================================

const getMasterConfig = async () => {
  let config = await FabricationJob.findOne({ jobId: 'FAB-GLOBAL-CONFIG' });
  if (!config) {
    config = new FabricationJob({
      jobId: 'FAB-GLOBAL-CONFIG',
      jobTitle: 'Master Fabrication Configuration',
      clientName: 'System Master Config',
      clientPhone: '0000000000',
      status: 'On Hold',
      terms: DEFAULT_INVOICE_TERMS,
      materials: DEFAULT_FABRICATION_MATERIALS,
      workScopes: DEFAULT_WORK_SCOPE_DESCRIPTIONS,
      itemPresets: DEFAULT_ITEM_PRESETS,
      units: DEFAULT_FABRICATION_UNITS
    });
    await config.save();
  } else {
    let changed = false;
    if (!config.terms || config.terms.length === 0) {
      config.terms = DEFAULT_INVOICE_TERMS;
      changed = true;
    }
    if (!config.materials || config.materials.length === 0) {
      config.materials = DEFAULT_FABRICATION_MATERIALS;
      changed = true;
    }
    if (!config.workScopes || config.workScopes.length === 0) {
      config.workScopes = DEFAULT_WORK_SCOPE_DESCRIPTIONS;
      changed = true;
    }
    if (!config.itemPresets || config.itemPresets.length === 0) {
      config.itemPresets = DEFAULT_ITEM_PRESETS;
      changed = true;
    }
    if (!config.units || config.units.length === 0) {
      config.units = DEFAULT_FABRICATION_UNITS;
      changed = true;
    }
    if (changed) {
      await FabricationJob.updateOne(
        { _id: config._id },
        {
          $set: {
            terms: config.terms,
            materials: config.materials,
            workScopes: config.workScopes,
            itemPresets: config.itemPresets,
            units: config.units
          }
        }
      );
    }
  }
  return config;
};

// ==========================================
// 6. Quotation Terms & Conditions Management
// ==========================================
export const getQuotationTerms = async (req, res) => {
  try {
    const config = await getMasterConfig();
    const sorted = [...(config.terms || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    return res.status(200).json({ success: true, data: sorted });
  } catch (error) {
    console.error('Error fetching quotation terms:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createQuotationTerm = async (req, res) => {
  try {
    const { text, enabled = true } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: 'Term text is required' });
    }
    const config = await getMasterConfig();
    const maxOrder = (config.terms || []).reduce((max, t) => Math.max(max, t.order || 0), 0);
    const newTerm = {
      text: String(text).trim(),
      enabled: Boolean(enabled),
      order: maxOrder + 1,
      isDefault: false
    };
    config.terms.push(newTerm);
    await config.save();
    const created = config.terms[config.terms.length - 1];
    return res.status(201).json({ success: true, message: 'Quotation clause created successfully', data: created });
  } catch (error) {
    console.error('Error creating quotation term:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateQuotationTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, enabled, order } = req.body;
    const config = await getMasterConfig();
    const term = config.terms.id(id);
    if (!term) return res.status(404).json({ success: false, message: 'Quotation clause not found' });
    if (text !== undefined) term.text = String(text).trim();
    if (enabled !== undefined) term.enabled = Boolean(enabled);
    if (order !== undefined) term.order = Number(order);
    await config.save();
    return res.status(200).json({ success: true, message: 'Quotation clause updated successfully', data: term });
  } catch (error) {
    console.error('Error updating quotation term:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteQuotationTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getMasterConfig();
    const term = config.terms.id(id);
    if (!term) return res.status(404).json({ success: false, message: 'Quotation clause not found' });
    config.terms.pull(id);
    await config.save();
    return res.status(200).json({ success: true, message: 'Quotation clause deleted successfully' });
  } catch (error) {
    console.error('Error deleting quotation term:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetQuotationTerms = async (req, res) => {
  try {
    const config = await getMasterConfig();
    config.terms = DEFAULT_INVOICE_TERMS;
    await config.save();
    return res.status(200).json({ success: true, message: 'Reset quotation clauses to standard defaults', data: config.terms });
  } catch (error) {
    console.error('Error resetting quotation terms:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateJobTerms = async (req, res) => {
  try {
    const { id } = req.params;
    const { terms } = req.body;
    const job = await FabricationJob.findById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Fabrication job not found' });
    job.terms = Array.isArray(terms) ? terms : [];
    job.updatedBy = req.user?._id || undefined;
    await job.save();
    return res.status(200).json({ success: true, message: 'Job quotation terms updated successfully', data: job.terms });
  } catch (error) {
    console.error('Error updating job terms:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 7. Fabrication Raw Materials Management
// ==========================================
export const getFabricationMaterials = async (req, res) => {
  try {
    const config = await getMasterConfig();
    const sorted = [...(config.materials || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    return res.status(200).json({ success: true, data: sorted });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createFabricationMaterial = async (req, res) => {
  try {
    const { name, description = '', density = 0 } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Material name is required' });
    }
    const cleanName = String(name).trim();
    const config = await getMasterConfig();
    const existing = config.materials.find(m => m.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      return res.status(200).json({ success: true, data: existing, message: 'Material already exists' });
    }
    const maxOrder = (config.materials || []).reduce((max, m) => Math.max(max, m.order || 0), 0);
    const newMaterial = {
      name: cleanName,
      description: String(description || '').trim(),
      density: Number(density) || 0,
      order: maxOrder + 1,
      isDefault: false
    };
    config.materials.push(newMaterial);
    await config.save();
    const created = config.materials[config.materials.length - 1];
    return res.status(201).json({ success: true, message: 'Material created successfully', data: created });
  } catch (error) {
    console.error('Error creating material:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFabricationMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, density, order } = req.body;
    const config = await getMasterConfig();
    const material = config.materials.id(id);
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });
    if (name !== undefined) material.name = String(name).trim();
    if (description !== undefined) material.description = String(description).trim();
    if (density !== undefined) material.density = Number(density);
    if (order !== undefined) material.order = Number(order);
    await config.save();
    return res.status(200).json({ success: true, message: 'Material updated successfully', data: material });
  } catch (error) {
    console.error('Error updating material:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFabricationMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getMasterConfig();
    const material = config.materials.id(id);
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });
    config.materials.pull(id);
    await config.save();
    return res.status(200).json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetFabricationMaterials = async (req, res) => {
  try {
    const config = await getMasterConfig();
    config.materials = DEFAULT_FABRICATION_MATERIALS;
    await config.save();
    return res.status(200).json({ success: true, message: 'Reset materials to standard defaults', data: config.materials });
  } catch (error) {
    console.error('Error resetting materials:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 8. Fabrication Work Scope Templates Management
// ==========================================
export const getFabricationWorkScopes = async (req, res) => {
  try {
    const config = await getMasterConfig();
    const sorted = [...(config.workScopes || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    return res.status(200).json({ success: true, data: sorted });
  } catch (error) {
    console.error('Error fetching work scopes:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createFabricationWorkScope = async (req, res) => {
  try {
    const { title, defaultUnit = 'Nos', category = 'General' } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Work scope title is required' });
    }
    const cleanTitle = String(title).trim();
    const config = await getMasterConfig();
    const existing = config.workScopes.find(s => s.title.toLowerCase() === cleanTitle.toLowerCase());
    if (existing) {
      return res.status(200).json({ success: true, data: existing, message: 'Work scope template already exists' });
    }
    const maxOrder = (config.workScopes || []).reduce((max, s) => Math.max(max, s.order || 0), 0);
    const newScope = {
      title: cleanTitle,
      defaultUnit,
      category,
      order: maxOrder + 1,
      isDefault: false
    };
    config.workScopes.push(newScope);
    await config.save();
    const created = config.workScopes[config.workScopes.length - 1];
    return res.status(201).json({ success: true, message: 'Work scope template created successfully', data: created });
  } catch (error) {
    console.error('Error creating work scope:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFabricationWorkScope = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, defaultUnit, category, order } = req.body;
    const config = await getMasterConfig();
    const scope = config.workScopes.id(id);
    if (!scope) return res.status(404).json({ success: false, message: 'Work scope not found' });
    if (title !== undefined) scope.title = String(title).trim();
    if (defaultUnit !== undefined) scope.defaultUnit = defaultUnit;
    if (category !== undefined) scope.category = category;
    if (order !== undefined) scope.order = Number(order);
    await config.save();
    return res.status(200).json({ success: true, message: 'Work scope updated successfully', data: scope });
  } catch (error) {
    console.error('Error updating work scope:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFabricationWorkScope = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getMasterConfig();
    const scope = config.workScopes.id(id);
    if (!scope) return res.status(404).json({ success: false, message: 'Work scope not found' });
    config.workScopes.pull(id);
    await config.save();
    return res.status(200).json({ success: true, message: 'Work scope deleted successfully' });
  } catch (error) {
    console.error('Error deleting work scope:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetFabricationWorkScopes = async (req, res) => {
  try {
    const config = await getMasterConfig();
    config.workScopes = DEFAULT_WORK_SCOPE_DESCRIPTIONS;
    await config.save();
    return res.status(200).json({ success: true, message: 'Reset work scopes to standard defaults', data: config.workScopes });
  } catch (error) {
    console.error('Error resetting work scopes:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 9. Fabrication Purchase Item Presets Management
// ==========================================
export const getFabricationItemPresets = async (req, res) => {
  try {
    const config = await getMasterConfig();
    const sorted = [...(config.itemPresets || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    return res.status(200).json({ success: true, data: sorted });
  } catch (error) {
    console.error('Error fetching item presets:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createFabricationItemPreset = async (req, res) => {
  try {
    const { description, category = 'Raw Material', defaultUnit = 'Nos' } = req.body;
    if (!description || !String(description).trim()) {
      return res.status(400).json({ success: false, message: 'Item description is required' });
    }
    const cleanDesc = String(description).trim();
    const config = await getMasterConfig();
    const existing = config.itemPresets.find(p => p.description.toLowerCase() === cleanDesc.toLowerCase());
    if (existing) {
      return res.status(200).json({ success: true, data: existing, message: 'Item preset already exists' });
    }
    const maxOrder = (config.itemPresets || []).reduce((max, p) => Math.max(max, p.order || 0), 0);
    const newPreset = {
      description: cleanDesc,
      category,
      defaultUnit,
      order: maxOrder + 1,
      isDefault: false
    };
    config.itemPresets.push(newPreset);
    await config.save();
    const created = config.itemPresets[config.itemPresets.length - 1];
    return res.status(201).json({ success: true, message: 'Item preset created successfully', data: created });
  } catch (error) {
    console.error('Error creating item preset:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFabricationItemPreset = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, category, defaultUnit, order } = req.body;
    const config = await getMasterConfig();
    const preset = config.itemPresets.id(id);
    if (!preset) return res.status(404).json({ success: false, message: 'Item preset not found' });
    if (description !== undefined) preset.description = String(description).trim();
    if (category !== undefined) preset.category = category;
    if (defaultUnit !== undefined) preset.defaultUnit = defaultUnit;
    if (order !== undefined) preset.order = Number(order);
    await config.save();
    return res.status(200).json({ success: true, message: 'Item preset updated successfully', data: preset });
  } catch (error) {
    console.error('Error updating item preset:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFabricationItemPreset = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getMasterConfig();
    const preset = config.itemPresets.id(id);
    if (!preset) return res.status(404).json({ success: false, message: 'Item preset not found' });
    config.itemPresets.pull(id);
    await config.save();
    return res.status(200).json({ success: true, message: 'Item preset deleted successfully' });
  } catch (error) {
    console.error('Error deleting item preset:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetFabricationItemPresets = async (req, res) => {
  try {
    const config = await getMasterConfig();
    config.itemPresets = DEFAULT_ITEM_PRESETS;
    await config.save();
    return res.status(200).json({ success: true, message: 'Reset item presets to standard defaults', data: config.itemPresets });
  } catch (error) {
    console.error('Error resetting item presets:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 10. Fabrication Vendors Management (MongoDB)
// ==========================================
export const getFabricationVendors = async (req, res) => {
  try {
    let vendors = await Vendor.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();
    if (!vendors || vendors.length === 0) {
      await Vendor.insertMany(DEFAULT_FABRICATION_VENDORS.map(v => ({ ...v, isActive: true })));
      vendors = await Vendor.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();
    }
    return res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    console.error('Error fetching fabrication vendors:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createFabricationVendor = async (req, res) => {
  try {
    const { name, phone = '', notes = '', email = '', address = '', gstin = '' } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Vendor name is required' });
    }
    const cleanName = String(name).trim();
    let vendor = await Vendor.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
    if (vendor) {
      if (phone && !vendor.phone) vendor.phone = phone;
      if (notes && !vendor.notes) vendor.notes = notes;
      vendor.isActive = true;
      await vendor.save();
      return res.status(200).json({ success: true, message: 'Vendor already exists', data: vendor });
    }
    vendor = new Vendor({
      name: cleanName,
      phone: String(phone || '').trim(),
      notes: String(notes || '').trim(),
      email: String(email || '').trim(),
      address: String(address || '').trim(),
      gstin: String(gstin || '').trim(),
      isActive: true,
      createdBy: req.user?._id || undefined
    });
    await vendor.save();
    return res.status(201).json({ success: true, message: 'Vendor created successfully', data: vendor });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 11. Fabrication Expense Categories Management (MongoDB)
// ==========================================
export const getFabricationExpenseCategories = async (req, res) => {
  try {
    let categories = await ExpenseCategory.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();
    if (!categories || categories.length === 0) {
      await ExpenseCategory.insertMany(
        DEFAULT_FABRICATION_EXPENSE_CATEGORIES.map(c => ({ name: c, isActive: true, isSystemDefault: true }))
      );
      categories = await ExpenseCategory.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();
    }
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// 13. Retroactive Sync All Fabrication Jobs to Accounts
export const syncAllFabricationToAccounts = async (req, res) => {
  try {
    const result = await syncAllJobsToAccounts();
    return res.status(200).json({
      success: true,
      message: 'Fabrication records synchronized to Accounts successfully',
      data: result
    });
  } catch (error) {
    console.error('Error syncing fabrication to accounts:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync fabrication to accounts'
    });
  }
};


// ==========================================
// 11. Fabrication Quotation Units Management
// ==========================================
export const getFabricationUnits = async (req, res) => {
  try {
    const config = await getMasterConfig();
    const sorted = [...(config.units || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    return res.status(200).json({ success: true, data: sorted });
  } catch (error) {
    console.error('Error fetching units:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createFabricationUnit = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Unit name is required' });
    }
    const cleanName = String(name).trim();
    const config = await getMasterConfig();
    const existing = (config.units || []).find(u => u.name && u.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      return res.status(200).json({ success: true, data: existing, message: 'Unit already exists' });
    }
    const maxOrder = (config.units || []).reduce((max, u) => Math.max(max, u.order || 0), 0);
    const newUnit = {
      name: cleanName,
      order: maxOrder + 1,
      isDefault: false
    };
    if (!config.units) config.units = [];
    config.units.push(newUnit);
    await config.save();
    const created = config.units[config.units.length - 1];
    return res.status(201).json({ success: true, message: 'Unit added successfully', data: created });
  } catch (error) {
    console.error('Error creating unit:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFabricationUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order } = req.body;
    const config = await getMasterConfig();
    const unit = config.units.id(id);
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    if (name !== undefined) unit.name = String(name).trim();
    if (order !== undefined) unit.order = Number(order);
    await config.save();
    return res.status(200).json({ success: true, message: 'Unit updated successfully', data: unit });
  } catch (error) {
    console.error('Error updating unit:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFabricationUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getMasterConfig();
    const unit = config.units.id(id);
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    config.units.pull(id);
    await config.save();
    return res.status(200).json({ success: true, message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Error deleting unit:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetFabricationUnits = async (req, res) => {
  try {
    const config = await getMasterConfig();
    config.units = DEFAULT_FABRICATION_UNITS;
    await config.save();
    return res.status(200).json({ success: true, message: 'Reset units to standard defaults', data: config.units });
  } catch (error) {
    console.error('Error resetting units:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
