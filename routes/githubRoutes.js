// server/routes/githubRoutes.js
import express from 'express';
import { uploadRoadmap, getPublishedRoadmaps } from '../controllers/githubController.js';

const router = express.Router();

// Upload roadmap to GitHub
router.post('/upload', uploadRoadmap);

// Get all published roadmaps
router.get('/roadmaps', getPublishedRoadmaps);

export default router;