// server/models/Roadmap.js
import mongoose from 'mongoose';

// Schema for individual role data within a consolidated roadmap
const RoleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  techStacks: [{
    type: String,
    required: true,
    trim: true
  }]
});

// Main Roadmap Schema
const RoadmapSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    trim: true
  },
  techStacks: [{
    type: String,
    required: true,
    trim: true
  }],
  publishedUrl: {
    type: String,
    required: true,
    trim: true
  },
  filename: {
    type: String,
    required: true,
    trim: true
  },
  isConsolidated: {
    type: Boolean,
    default: false
  },
  roles: [RoleSchema],
  createdDate: {
    type: Date,
    default: Date.now
  }
});

const Roadmap = mongoose.model('Roadmap', RoadmapSchema);

export default Roadmap;