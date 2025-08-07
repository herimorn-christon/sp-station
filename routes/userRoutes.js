import express from 'express';
import { login, createUser, getUsers, updateUser, deleteUser, getCurrentUser, changePassword } from '../controllers/userController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Authentication & User CRUD
router.post('/login', login);
router.post(
  '/register',
  authenticateToken,
  authorizeRole(['admin']),
  createUser
);
router.get(
  '/',
  authenticateToken,
  authorizeRole(['admin', 'operations', 'station_manager']),
  getUsers
);

// Edit User (Admin only)
router.put(
  '/:id',
  authenticateToken,
  authorizeRole(['admin']),
  updateUser
);
router.get('/me', authenticateToken, getCurrentUser);
router.post('/change-password', authenticateToken, changePassword);

// Delete User (Admin only)
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole(['admin']),
  deleteUser
);

export default router;
