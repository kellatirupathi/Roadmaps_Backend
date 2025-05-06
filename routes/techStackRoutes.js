// server/routes/techStackRoutes.js
import express from 'express';
import {
  getAllTechStacks,
  getTechStackById,
  getTechStackByName,
  createTechStack,
  updateTechStack,
  deleteTechStack,
  deleteAllTechStacks,
  addRoadmapItem,
  updateRoadmapItem,
  deleteRoadmapItem
} from '../controllers/techStackController.js';

const router = express.Router();

// Get all tech stacks and create a new tech stack
router
  .route('/')
  .get(getAllTechStacks)
  .post(createTechStack);

// Delete all tech stacks
router.route('/all').delete(deleteAllTechStacks);

// Get, update, and delete a tech stack by ID
router
  .route('/:id')
  .get(getTechStackById)
  .put(updateTechStack)
  .delete(deleteTechStack);

// Get a tech stack by name
router.route('/name/:name').get(getTechStackByName);

// Add a roadmap item to a tech stack
router.route('/:id/roadmap-item').post(addRoadmapItem);

// Update and delete a roadmap item
router
  .route('/:id/roadmap-item/:itemId')
  .put(updateRoadmapItem)
  .delete(deleteRoadmapItem);

export default router;