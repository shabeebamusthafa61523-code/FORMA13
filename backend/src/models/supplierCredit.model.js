import mongoose from 'mongoose';

const supplierCreditSchema = new mongoose.Schema({
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
  billNumber: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    default: 'Raw Material',
    trim: true
  },
  itemDescription: {
    type: String,
    default: '',
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
  collection: 'supplier_credits'
});

const SupplierCredit = mongoose.model('SupplierCredit', supplierCreditSchema);
export default SupplierCredit;
