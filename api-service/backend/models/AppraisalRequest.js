import mongoose from 'mongoose';

const appraisalRequestSchema = new mongoose.Schema({
  applicationType: {
    type: String,
    default: 'infonavit_appraisal',
    trim: true
  },
  beneficiaryName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160
  },
  beneficiaryPhone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30
  },
  propertyOwnerName: {
    type: String,
    default: '',
    trim: true,
    maxlength: 160
  },
  propertyOwnerPhone: {
    type: String,
    default: '',
    trim: true,
    maxlength: 30
  },
  propertyStreet: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },
  propertyNeighborhood: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  municipality: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  state: {
    type: String,
    default: 'Nuevo León',
    trim: true,
    maxlength: 80
  },
  postalCode: {
    type: String,
    default: '',
    trim: true,
    maxlength: 10
  },
  propertyAgeYears: {
    type: Number,
    default: null,
    min: 0,
    max: 250
  },
  creditPurpose: {
    type: String,
    default: '',
    trim: true,
    maxlength: 120
  },
  documentsPresented: [{
    type: String,
    trim: true,
    maxlength: 120
  }],
  notes: {
    type: String,
    default: '',
    trim: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['pendiente', 'en_revision', 'completada', 'cancelada'],
    default: 'pendiente'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

appraisalRequestSchema.index({ status: 1, createdAt: -1 });

const AppraisalRequest = mongoose.models.AppraisalRequest
  || mongoose.model('AppraisalRequest', appraisalRequestSchema);

export default AppraisalRequest;
