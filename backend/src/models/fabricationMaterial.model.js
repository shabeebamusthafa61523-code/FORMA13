import mongoose from 'mongoose';

const fabricationMaterialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  density: {
    type: Number,
    default: 0
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
  collection: 'fabrication_materials'
});

const FabricationMaterial = mongoose.model('FabricationMaterial', fabricationMaterialSchema);
export default FabricationMaterial;
