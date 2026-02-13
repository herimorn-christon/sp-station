import express from 'express';
import {
  getSystemStats,
  createDatabaseBackup,
  getBackupFiles,
  downloadBackup,
  deleteBackup,
  optimizeDatabase,
  getSystemHealth
} from '../controllers/systemController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// All system routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRole(['admin']));

// Database statistics
router.get('/stats', getSystemStats);

// Database backup operations
router.post('/backup', createDatabaseBackup);
router.get('/backups', getBackupFiles);
router.get('/backup/:filename', downloadBackup);
router.delete('/backup/:filename', deleteBackup);

// Database optimization
router.post('/optimize', optimizeDatabase);

// System health check
router.get('/health', getSystemHealth);

export default router;