import mongoose from 'mongoose';

const quotationItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  material: { type: String, default: '', trim: true },
  quantity: { type: Number, required: true, default: 1, min: 0 },
  unit: { 
    type: String, 
    default: 'Nos',
    trim: true
  },
  unitPrice: { type: Number, required: true, default: 0, min: 0 },
  discountType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
  discountValue: { type: Number, default: 0, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  amount: { type: Number, required: true, default: 0, min: 0 },
  notes: { type: String, default: '', trim: true }
}, { _id: true, timestamps: true });

const dailyWageSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  employeeName: { type: String, required: true, trim: true },
  workDescription: { type: String, default: '', trim: true },
  shiftType: { 
    type: String, 
    enum: ['Full Day', 'Half Day', 'Overtime', 'Piece Rate'], 
    default: 'Full Day' 
  },
  dailyRate: { type: Number, required: true, default: 0, min: 0 },
  overtimeHours: { type: Number, default: 0, min: 0 },
  overtimeRate: { type: Number, default: 0, min: 0 },
  totalWage: { type: Number, required: true, default: 0, min: 0 },
  notes: { type: String, default: '', trim: true }
}, { _id: true, timestamps: true });

const purchaseExpenseSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  type: { 
    type: String, 
    enum: ['Purchase', 'Expense'], 
    default: 'Purchase',
    required: true 
  },
  category: { 
    type: String, 
    default: 'Raw Material',
    trim: true
  },
  itemDescription: { type: String, default: '', trim: true },
  vendorName: { type: String, default: '', trim: true },
  billNumber: { type: String, default: '', trim: true },
  quantity: { type: Number, default: 1, min: 0 },
  unit: { 
    type: String, 
    default: 'Nos',
    trim: true
  },
  rate: { type: Number, default: 0, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  paymentMode: { 
    type: String, 
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit/Pay Later'], 
    default: 'Cash' 
  },
  receiptUrl: { type: String, default: '' },
  notes: { type: String, default: '', trim: true }
}, { _id: true, timestamps: true });

const clientPaymentSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true, min: 0 },
  paymentMode: { 
    type: String, 
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'], 
    default: 'Cash' 
  },
  transactionReference: { type: String, default: '', trim: true },
  receivedBy: { type: String, default: '', trim: true },
  notes: { type: String, default: '', trim: true }
}, { _id: true, timestamps: true });

const fabricationJobSchema = new mongoose.Schema({
  jobId: { 
    type: String, 
    unique: true, 
    required: true,
    uppercase: true, 
    trim: true 
  },
  jobTitle: { type: String, default: '', trim: true },
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client',
    required: false 
  },
  clientName: { type: String, required: true, trim: true },
  clientPhone: { type: String, required: true, trim: true },
  clientEmail: { type: String, default: '', trim: true },
  siteAddress: { type: String, default: '', trim: true },
  status: { 
    type: String, 
    enum: ['Quotation Stage', 'Confirmed / In Progress', 'On Hold', 'Completed', 'Cancelled'],
    default: 'Quotation Stage'
  },
  startDate: { type: Date, default: Date.now },
  deliveryDate: { type: Date },

  // Line items
  quotationItems: [quotationItemSchema],
  dailyWages: [dailyWageSchema],
  purchasesAndExpenses: [purchaseExpenseSchema],
  clientPayments: [clientPaymentSchema],

  // Quotation overall discount
  quotationDiscount: {
    type: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    value: { type: Number, default: 0, min: 0 },
    amount: { type: Number, default: 0, min: 0 }
  },

  // Auto-calculated Financial Totals
  financials: {
    grossQuotation: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalQuotation: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
    totalWages: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    totalDirectCost: { type: Number, default: 0 },
    totalAmountReceived: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 }
  },

  notes: { type: String, default: '', trim: true },
  // Custom or selected terms & conditions snapshot for this specific job invoice
  terms: [{
    text: { type: String, trim: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false }
  }],
  // Master fabrication materials catalog
  materials: [{
    name: { type: String, trim: true },
    description: { type: String, default: '' },
    density: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false }
  }],
  // Master fabrication work scope templates
  workScopes: [{
    title: { type: String, trim: true },
    defaultUnit: { type: String, default: 'Nos' },
    category: { type: String, default: 'General' },
    order: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false }
  }],
  // Master fabrication item presets
  itemPresets: [{
    description: { type: String, trim: true },
    category: { type: String, default: 'Raw Material' },
    defaultUnit: { type: String, default: 'Nos' },
    order: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false }
  }],
  // Master fabrication quotation units catalog
  units: [{
    name: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Helper function to recalculate financial totals
fabricationJobSchema.methods.recalculateFinancials = function () {
  const grossQuotation = (this.quotationItems || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  
  let overallDiscountAmount = 0;
  if (this.quotationDiscount) {
    const discType = this.quotationDiscount.type || 'fixed';
    const discVal = Number(this.quotationDiscount.value) || 0;
    if (discType === 'percentage') {
      overallDiscountAmount = (grossQuotation * discVal) / 100;
    } else {
      overallDiscountAmount = discVal;
    }
    overallDiscountAmount = Math.min(grossQuotation, Math.max(0, overallDiscountAmount));
    this.quotationDiscount.amount = Math.round(overallDiscountAmount * 100) / 100;
  }

  const totalQuotation = Math.max(0, grossQuotation - overallDiscountAmount);

  const totalWages = (this.dailyWages || []).reduce((sum, item) => sum + (Number(item.totalWage) || 0), 0);

  let totalPurchases = 0;
  let totalExpenses = 0;
  (this.purchasesAndExpenses || []).forEach(item => {
    const amt = Number(item.amount) || 0;
    if (item.type === 'Purchase') {
      totalPurchases += amt;
    } else {
      totalExpenses += amt;
    }
  });

  const totalDirectCost = totalPurchases + totalWages + totalExpenses;
  const totalAmountReceived = (this.clientPayments || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const balanceDue = Math.max(0, totalQuotation - totalAmountReceived);
  const netProfit = totalAmountReceived - totalDirectCost;

  this.financials = {
    grossQuotation: Math.round(grossQuotation * 100) / 100,
    discountAmount: Math.round(overallDiscountAmount * 100) / 100,
    totalQuotation: Math.round(totalQuotation * 100) / 100,
    totalPurchases: Math.round(totalPurchases * 100) / 100,
    totalWages: Math.round(totalWages * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalDirectCost: Math.round(totalDirectCost * 100) / 100,
    totalAmountReceived: Math.round(totalAmountReceived * 100) / 100,
    balanceDue: Math.round(balanceDue * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100
  };

  return this.financials;
};

// Pre-save hook to ensure financials are always up-to-date
fabricationJobSchema.pre('save', function () {
  this.recalculateFinancials();
});

const FabricationJob = mongoose.model('FabricationJob', fabricationJobSchema);

export default FabricationJob;
