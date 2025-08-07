import pool from '../config/db.js';
import * as XLSX from 'xlsx';
import NotificationService from '../services/notificationService.js';

// Add delay helper function
const delay = (minutes) => new Promise(resolve => setTimeout(resolve, minutes * 60 * 1000));

export const createSalesData = async (req, res) => {
  try {
    const { station_id, date, pms_sales, ago_sales, lpg_sales } = req.body;
    const result = await pool.query(
      'INSERT INTO sales_data (station_id, date, pms_sales, ago_sales, lpg_sales) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [station_id, date, pms_sales, ago_sales, lpg_sales]
    );

    // Get admin and operations users for notifications
    const users = await pool.query(
      'SELECT email FROM users WHERE role IN ($1, $2)',
      ['admin', 'operations']
    );

    // Send sales report notification
    await NotificationService.notifySalesReport(result.rows[0], users.rows);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const uploadBulkSales = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = [];
    for (const row of data) {
      // Validate required fields
      if (!row.station_id || !row.date || !row.pms_sales || !row.ago_sales || !row.lpg_sales) {
        return res.status(400).json({ message: 'Invalid data format in Excel file' });
      }

      const result = await pool.query(
        'INSERT INTO sales_data (station_id, date, pms_sales, ago_sales, lpg_sales) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [row.station_id, row.date, row.pms_sales, row.ago_sales, row.lpg_sales]
      );
      results.push(result.rows[0]);
    }

    res.status(201).json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getSalesData = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sd.*, s.name as station_name 
      FROM sales_data sd 
      JOIN stations s ON sd.station_id = s.id 
      ORDER BY sd.date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const exportSalesData = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.name as station_name,
        sd.date,
        sd.pms_sales,
        sd.ago_sales,
        sd.lpg_sales,
        sd.created_at
      FROM sales_data sd 
      JOIN stations s ON sd.station_id = s.id 
      ORDER BY sd.date DESC
    `);

    const worksheet = XLSX.utils.json_to_sheet(result.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Data');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_data.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getSalesAnalytics = async (req, res) => {
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
      FROM sales_data sd 
      JOIN stations s ON sd.station_id = s.id 
      GROUP BY s.name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const emailSalesReport = async (req, res) => {
  try {
    // Set default email to herimornchriston@gmail.com
    const { reportType, delayMinutes = 1 } = req.body;
    const email = 'herimornchriston@gmail.com';
    
    // Get sales data
    const result = await pool.query(`
      SELECT sd.*, s.name as station_name 
      FROM sales_data sd 
      JOIN stations s ON sd.station_id = s.id 
      ORDER BY sd.date DESC
    `);

    // Send immediate response to client
    res.json({ message: `Report will be sent in ${delayMinutes} minute(s)` });

    // Wait for specified delay
    await delay(delayMinutes);

    // Send email report after delay
    await NotificationService.notifySalesReport(
      {
        data: result.rows,
        type: reportType,
        totalSales: result.rows.reduce((sum, row) => 
          sum + row.pms_sales + row.ago_sales + row.lpg_sales, 0
        )
      },
      [{ email }]
    );

    console.log(`Email sent successfully to ${email} after ${delayMinutes} minute(s) delay`);
  } catch (error) {
    console.error('Error sending delayed email:', error);
  }
};