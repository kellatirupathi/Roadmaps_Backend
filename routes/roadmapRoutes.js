// server/routes/roadmapRoutes.js
import express from 'express';
import {
  getAllRoadmaps,
  getRoadmapById,
  createRoadmap,
  updateRoadmap,
  deleteRoadmap,
  getRoadmapsByCompany,
  getRoadmapsByRole,
  getConsolidatedRoadmaps
} from '../controllers/roadmapController.js';

const router = express.Router();

// Get all roadmaps and create a new roadmap
router
  .route('/')
  .get(getAllRoadmaps)
  .post(createRoadmap);

// Get, update, and delete a roadmap by ID
router
  .route('/:id')
  .get(getRoadmapById)
  .put(updateRoadmap)
  .delete(deleteRoadmap);

// Get consolidated roadmaps
router.route('/consolidated').get(getConsolidatedRoadmaps);

// Get roadmaps by company name
router.route('/company/:companyName').get(getRoadmapsByCompany);

// Get roadmaps by role
router.route('/role/:role').get(getRoadmapsByRole);

export default router;