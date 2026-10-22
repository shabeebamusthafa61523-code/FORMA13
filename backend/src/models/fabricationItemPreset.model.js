import mongoose from 'mongoose';

const fabricationItemPresetSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: 'Raw Material',
    trim: true
  },
  defaultUnit: {
    type: String,
    default: 'Nos',
    enum: ['Sq.Ft', 'Inches', 'Feet', 'Kg', 'Nos', 'Lengths', 'Meters', 'Tons', 'Box', 'Litres', 'Lumpsum']
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
  collection: 'fabrication_item_presets'
});

const FabricationItemPreset = mongoose.model('FabricationItemPreset', fabricationItemPresetSchema);
export default FabricationItemPreset;
