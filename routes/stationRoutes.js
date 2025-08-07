import express from 'express';
import { createStation, getStations, updateStation } from '../controllers/stationController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, authorizeRole(['admin']), createStation);
router.get('/', authenticateToken, getStations);
router.put('/:id', authenticateToken, authorizeRole(['admin']), updateStation);

export default router;