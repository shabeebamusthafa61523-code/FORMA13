import mongoose from 'mongoose';

const supplierPaymentSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  vendorName: {
    type: String,
    trim: true,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMode: {
    type: String,
    default: 'Bank Transfer',
    trim: true
  },
  referenceNo: {
    type: String,
    default: '',
    trim: true
  },
  fabricationJobId: {
    type: String,
    default: null,
    trim: true
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  collection: 'supplier_payments'
});

const SupplierPayment = mongoose.model('SupplierPayment', supplierPaymentSchema);
export default SupplierPayment;
