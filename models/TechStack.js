// server/models/TechStack.js
import mongoose from 'mongoose';

// Schema for the roadmap items (topics, subtopics, projects, status)
const RoadmapItemSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    trim: true
  },
  subTopics: [{
    name: {
      type: String,
      required: true,
      trim: true
    }
  }],
  projects: [{
    name: {
      type: String,
      required: true,
      trim: true
    }
  }],
  completionStatus: {
    type: String,
    enum: ['Yet to Start', 'In Progress', 'Completed'],
    default: 'Yet to Start'
  }
});

// Schema for the tech stack
const TechStackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Add headers field to store custom column headers
  headers: {
    topic: { 
      type: String, 
      default: "Topic" 
    },
    subTopics: { 
      type: String, 
      default: "Sub-Topics" 
    },
    projects: { 
      type: String, 
      default: "Projects" 
    },
    status: { 
      type: String, 
      default: "Status" 
    }
  },
  roadmapItems: [RoadmapItemSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the timestamp when a document is updated
TechStackSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const TechStack = mongoose.model('TechStack', TechStackSchema);

export default TechStack;