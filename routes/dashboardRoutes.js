import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get sales analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.name as station_name,
        SUM(sd.pms_sales) as total_pms,
        SUM(sd.ago_sales) as total_ago,
        SUM(sd.lpg_sales) as total_lpg,
        AVG(sd.pms_sales) as avg_pms,
        AVG(sd.ago_sales) as avg_ago,
        AVG(sd.lpg_sales) as avg_lpg
      FROM stations s
      LEFT JOIN sales_data sd ON s.id = sd.station_id
      GROUP BY s.id, s.name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get total users
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Get total stations
    const stationsResult = await pool.query('SELECT COUNT(*) FROM stations');
    const totalStations = parseInt(stationsResult.rows[0].count);

    // Get total sales
    const salesResult = await pool.query(
      'SELECT SUM(pms_sales + ago_sales + lpg_sales) as total FROM sales_data'
    );
    const totalSales = parseFloat(salesResult.rows[0].total) || 0;

    // System status is hardcoded for now, but could be dynamic
    const systemStatus = 'operational';

    res.json({
      totalUsers,
      totalStations,
      totalSales,
      systemStatus
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;