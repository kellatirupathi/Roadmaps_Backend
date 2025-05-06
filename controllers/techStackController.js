// server/controllers/techStackController.js
import TechStack from '../models/TechStack.js';

// Get all tech stacks (names only for dropdown)
export const getAllTechStacks = async (req, res) => {
  try {
    const techStacks = await TechStack.find({}, 'name');
    res.status(200).json({
      success: true,
      count: techStacks.length,
      data: techStacks
    });
  } catch (error) {
    console.error('Error in getAllTechStacks:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get a specific tech stack by ID
export const getTechStackById = async (req, res) => {
  try {
    const techStack = await TechStack.findById(req.params.id);
    
    if (!techStack) {
      return res.status(404).json({
        success: false,
        error: 'Tech stack not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: techStack
    });
  } catch (error) {
    console.error('Error in getTechStackById:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get a specific tech stack by name
export const getTechStackByName = async (req, res) => {
  try {
    const techStack = await TechStack.findOne({ name: req.params.name });
    
    if (!techStack) {
      return res.status(404).json({
        success: false,
        error: 'Tech stack not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: techStack
    });
  } catch (error) {
    console.error('Error in getTechStackByName:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Create a new tech stack
export const createTechStack = async (req, res) => {
  try {
    const techStack = await TechStack.create(req.body);
    
    res.status(201).json({
      success: true,
      data: techStack
    });
  } catch (error) {
    console.error('Error in createTechStack:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Tech stack with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Update a tech stack
export const updateTechStack = async (req, res) => {
  try {
    const techStack = await TechStack.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!techStack) {
      return res.status(404).json({
        success: false,
        error: 'Tech stack not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: techStack
    });
  } catch (error) {
    console.error('Error in updateTechStack:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Delete a tech stack
export const deleteTechStack = async (req, res) => {
  try {
    const techStack = await TechStack.findByIdAndDelete(req.params.id);
    
    if (!techStack) {
      return res.status(404).json({
        success: false,
        error: 'Tech stack not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error in deleteTechStack:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Delete all tech stacks
export const deleteAllTechStacks = async (req, res) => {
  try {
    // Delete all tech stacks from the database
    await TechStack.deleteMany({});
    
    res.status(200).json({
      success: true,
      message: 'All tech stacks have been deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('Error in deleteAllTechStacks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all tech stacks'
    });
  }
};

// Add a roadmap item to a tech stack
export const addRoadmapItem = async (req, res) => {
  try {
    const techStack = await TechStack.findById(req.params.id);
    
    if (!techStack) {
      return res.status(404).json({
        success: false,
        error: 'Tech stack not found'
      });
    }
    
    techStack.roadmapItems.push(req.body);
    await techStack.save();
    
    res.status(200).json({
      success: true,
      data: techStack
    });
  } catch (error) {
    console.error('Error in addRoadmapItem:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Update a roadmap item in a tech stack
export const updateRoadmapItem = async (req, res) => {
  try {
    const techStack = await TechStack.findById(req.params.id);
    
    if (!techStack) {
      return res.status(404).json({
        success: false,
        error: 'Tech stack not found'
      });
    }
    
    const itemIndex = techStack.roadmapItems.findIndex(
      item => item._id.toString() === req.params.itemId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap item not found'
      });
    }
    
    techStack.roadmapItems[itemIndex] = {
      ...techStack.roadmapItems[itemIndex].toObject(),
      ...req.body
    };
    
    await techStack.save();
    
    res.status(200).json({
      success: true,
      data: techStack
    });
  } catch (error) {
    console.error('Error in updateRoadmapItem:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Delete a roadmap item from a tech stack
export const deleteRoadmapItem = async (req, res) => {
  try {
    const techStack = await TechStack.findById(req.params.id);
    
    if (!techStack) {
      return res.status(404).json({
        success: false,
        error: 'Tech stack not found'
      });
    }
    
    techStack.roadmapItems = techStack.roadmapItems.filter(
      item => item._id.toString() !== req.params.itemId
    );
    
    await techStack.save();
    
    res.status(200).json({
      success: true,
      data: techStack
    });
  } catch (error) {
    console.error('Error in deleteRoadmapItem:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};