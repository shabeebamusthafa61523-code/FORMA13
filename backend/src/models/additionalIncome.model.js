import mongoose from 'mongoose';

const additionalIncomeSchema = new mongoose.Schema({
  source: { 
    type: String, 
    required: [true, 'Income source is required'], 
    trim: true 
  },
  amount: { 
    type: Number, 
    required: [true, 'Income amount is required'], 
    min: [0.01, 'Amount must be greater than zero'] 
  },
  date: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  paymentMode: { 
    type: String, 
    enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Bank', 'Other'], 
    default: 'Bank Transfer' 
  },
  referenceNo: { 
    type: String, 
    default: '', 
    trim: true 
  },
  notes: { 
    type: String, 
    default: '', 
    trim: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  createdByName: { 
    type: String, 
    default: 'Accountant' 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

const AdditionalIncome = mongoose.model('AdditionalIncome', additionalIncomeSchema);
export default AdditionalIncome;
