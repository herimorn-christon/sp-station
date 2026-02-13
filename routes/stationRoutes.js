import express from 'express';
import multer from 'multer';
import {
  createStation,
  getStations,
  updateStation,
  importStationsAndSales,
  getDatabaseStats,
  createDatabaseBackup,
  getBackupFiles,
  downloadBackup,
  deleteBackup,
  optimizeDatabase
} from '../controllers/stationController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authenticateToken, authorizeRole(['admin']), createStation);
router.post('/import', authenticateToken, authorizeRole(['admin']), upload.single('file'), importStationsAndSales);
router.get('/', authenticateToken, getStations);
router.put('/:id', authenticateToken, authorizeRole(['admin']), updateStation);

// Database management routes
router.get('/db/stats', authenticateToken, authorizeRole(['admin']), getDatabaseStats);
router.post('/db/backup', authenticateToken, authorizeRole(['admin']), createDatabaseBackup);
router.get('/db/backups', authenticateToken, authorizeRole(['admin']), getBackupFiles);
router.get('/db/backup/:filename', authenticateToken, authorizeRole(['admin']), downloadBackup);
router.delete('/db/backup/:filename', authenticateToken, authorizeRole(['admin']), deleteBackup);
router.post('/db/optimize', authenticateToken, authorizeRole(['admin']), optimizeDatabase);

export default router;