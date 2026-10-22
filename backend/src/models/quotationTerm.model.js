import mongoose from 'mongoose';

const quotationTermSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'quotation_terms'
});

const QuotationTerm = mongoose.model('QuotationTerm', quotationTermSchema);
export default QuotationTerm;
