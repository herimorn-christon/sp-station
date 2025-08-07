import express from 'express';
import { createWorkPermit, getWorkPermits, updateWorkPermitStatus } from '../controllers/workPermitController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Create work permit
router.post(
  '/',
  authenticateToken,
  authorizeRole(['station_manager', 'operations', 'admin']),
  createWorkPermit
);

// Get work permits
router.get('/', authenticateToken, getWorkPermits);
router.get('/complaint/:complaint_id', authenticateToken, getWorkPermits);

// Update work permit status
router.put('/:id/status', authenticateToken, authorizeRole(['operations', 'admin']), updateWorkPermitStatus);

export default router;