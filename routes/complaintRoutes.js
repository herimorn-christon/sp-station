import express from 'express';
import upload from '../middleware/multerConfig.js';
import { 
  createComplaint, 
  getComplaints, 
  updateComplaintStatus, 
  assignToUnicorn, 
  assignToTrident,
  markInHouseRepair, 
  unicornReceiveComplaint,
  tridentReceiveComplaint 
} from '../controllers/complaintController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Only station managers can create complaints
router.post(
  '/',
  authenticateToken,
  authorizeRole(['station_manager']),
  upload.fields([
    { name: 'image_url', maxCount: 1 },
    { name: 'video_url', maxCount: 10 }
  ]),
  createComplaint
);

router.get('/', authenticateToken, getComplaints);

router.put('/:id/status', authenticateToken, authorizeRole(['station_manager', 'operations', 'unicorn', 'trident']), updateComplaintStatus);

// Operations can assign complaints to unicorn
router.put('/:id/assign-unicorn', authenticateToken, authorizeRole(['operations']), assignToUnicorn);

// Operations can assign complaints to trident
router.put('/:id/assign-trident', authenticateToken, authorizeRole(['operations']), assignToTrident);

// Operations can mark complaints for in-house repair
router.put('/:id/mark-inhouse', authenticateToken, authorizeRole(['operations']), markInHouseRepair);

// Unicorn can receive complaints
router.put('/:id/receive', authenticateToken, authorizeRole(['unicorn']), unicornReceiveComplaint);

// Trident can receive complaints
router.put('/:id/receive-trident', authenticateToken, authorizeRole(['trident']), tridentReceiveComplaint);

export default router;