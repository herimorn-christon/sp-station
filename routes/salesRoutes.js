import express from 'express';
import multer from 'multer';
import { 
  createSalesData, 
  getSalesData, 
  getSalesAnalytics, 
  uploadBulkSales, 
  exportSalesData,
  emailSalesReport 
} from '../controllers/salesController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authenticateToken, authorizeRole(['station_manager']), createSalesData);
router.post('/upload', authenticateToken, authorizeRole(['admin', 'station_manager']), upload.single('file'), uploadBulkSales);
router.get('/', authenticateToken, getSalesData);
router.get('/export', authenticateToken, authorizeRole(['admin', 'operations']), exportSalesData);
router.get('/analytics', authenticateToken, authorizeRole(['admin', 'operations']), getSalesAnalytics);
router.post('/email-report', authenticateToken, authorizeRole(['admin', 'operations']), emailSalesReport);

export default router;