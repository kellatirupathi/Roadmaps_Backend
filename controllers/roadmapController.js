// server/controllers/roadmapController.js
import Roadmap from '../models/Roadmap.js';

// Get all roadmaps
export const getAllRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find().sort({ createdDate: -1 });
    
    res.status(200).json({
      success: true,
      count: roadmaps.length,
      data: roadmaps
    });
  } catch (error) {
    console.error('Error in getAllRoadmaps:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get a specific roadmap by ID
export const getRoadmapById = async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);
    
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: roadmap
    });
  } catch (error) {
    console.error('Error in getRoadmapById:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Create a new roadmap
export const createRoadmap = async (req, res) => {
  try {
    // Check if it's a consolidated roadmap with multiple roles
    if (req.body.isConsolidated && req.body.roles && req.body.roles.length > 0) {
      // For consolidated roadmaps, use a generic role name and include the roles array
      const roadmapData = {
        companyName: req.body.companyName,
        role: req.body.role || 'Consolidated',
        techStacks: req.body.techStacks,
        publishedUrl: req.body.publishedUrl,
        filename: req.body.filename,
        isConsolidated: true,
        roles: req.body.roles,
        createdDate: req.body.createdDate || new Date()
      };
      
      const roadmap = await Roadmap.create(roadmapData);
      
      res.status(201).json({
        success: true,
        data: roadmap
      });
    } else {
      // For regular single-role roadmaps
      const roadmap = await Roadmap.create(req.body);
      
      res.status(201).json({
        success: true,
        data: roadmap
      });
    }
  } catch (error) {
    console.error('Error in createRoadmap:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Update a roadmap
export const updateRoadmap = async (req, res) => {
  try {
    const roadmap = await Roadmap.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: roadmap
    });
  } catch (error) {
    console.error('Error in updateRoadmap:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Delete a roadmap
export const deleteRoadmap = async (req, res) => {
  try {
    const roadmap = await Roadmap.findByIdAndDelete(req.params.id);
    
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error in deleteRoadmap:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get roadmaps by company name
export const getRoadmapsByCompany = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ 
      companyName: { $regex: req.params.companyName, $options: 'i' } 
    }).sort({ createdDate: -1 });
    
    res.status(200).json({
      success: true,
      count: roadmaps.length,
      data: roadmaps
    });
  } catch (error) {
    console.error('Error in getRoadmapsByCompany:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get roadmaps by role
export const getRoadmapsByRole = async (req, res) => {
  try {
    // Search both in the role field and in the roles array for consolidated roadmaps
    const roadmaps = await Roadmap.find({ 
      $or: [
        { role: { $regex: req.params.role, $options: 'i' } },
        { 'roles.title': { $regex: req.params.role, $options: 'i' } }
      ]
    }).sort({ createdDate: -1 });
    
    res.status(200).json({
      success: true,
      count: roadmaps.length,
      data: roadmaps
    });
  } catch (error) {
    console.error('Error in getRoadmapsByRole:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get consolidated roadmaps
export const getConsolidatedRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ isConsolidated: true }).sort({ createdDate: -1 });
    
    res.status(200).json({
      success: true,
      count: roadmaps.length,
      data: roadmaps
    });
  } catch (error) {
    console.error('Error in getConsolidatedRoadmaps:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};