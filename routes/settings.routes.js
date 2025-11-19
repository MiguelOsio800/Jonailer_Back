import express from 'express';
import { getAllData } from '../controllers/settings.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/all-data', protect, getAllData);

export default router;