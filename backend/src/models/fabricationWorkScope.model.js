import mongoose from 'mongoose';

const fabricationWorkScopeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  defaultUnit: {
    type: String,
    default: 'Nos',
    enum: ['Sq.Ft', 'Inches', 'Feet', 'Kg', 'Nos', 'Lengths', 'Meters', 'Tons', 'Box', 'Litres', 'Lumpsum', 'Hours', 'Days']
  },
  category: {
    type: String,
    default: 'General',
    trim: true
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
  collection: 'fabrication_work_scopes'
});

const FabricationWorkScope = mongoose.model('FabricationWorkScope', fabricationWorkScopeSchema);
export default FabricationWorkScope;
