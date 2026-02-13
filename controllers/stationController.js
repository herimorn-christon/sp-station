import pool from '../config/db.js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export const createStation = async (req, res) => {
  try {
    const { name, location, manager_id } = req.body;
    const result = await pool.query(
      'INSERT INTO stations (name, location, manager_id) VALUES ($1, $2, $3) RETURNING *',
      [name, location, manager_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getStations = async (req, res) => {
  try {
    let query = 'SELECT * FROM stations';
    let params = [];

    if (req.user.role === 'station_manager') {
      query += ' WHERE manager_id = $1';
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);
    console.log('Stations returned:', result.rows); // Add this line
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting stations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateStation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, manager_id } = req.body;
    const result = await pool.query(
      'UPDATE stations SET name = $1, location = $2, manager_id = $3 WHERE id = $4 RETURNING *',
      [name, location, manager_id, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Database management functions
export const getDatabaseStats = async (req, res) => {
  try {
    const stats = {};

    // Get table row counts
    const tables = ['users', 'stations', 'sales_data', 'complaints', 'work_permits'];
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = parseInt(result.rows[0].count);
    }

    // Get database size info
    const dbSizeResult = await pool.query(`
      SELECT
        schemaname,
        tablename,
        attname,
        n_distinct,
        most_common_vals,
        most_common_freqs
      FROM pg_stats
      WHERE schemaname = 'public'
    `);

    // Get recent activity
    const recentActivity = await pool.query(`
      SELECT
        'stations' as table_name, COUNT(*) as count, MAX(created_at) as latest
        FROM stations
      WHERE created_at >= NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT
        'sales_data' as table_name, COUNT(*) as count, MAX(created_at) as latest
        FROM sales_data
      WHERE created_at >= NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT
        'complaints' as table_name, COUNT(*) as count, MAX(created_at) as latest
        FROM complaints
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    res.json({
      table_counts: stats,
      database_info: {
        total_tables: tables.length,
        total_records: Object.values(stats).reduce((a, b) => a + b, 0),
        recent_activity: recentActivity.rows
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createDatabaseBackup = async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.sql`;

    // Create backups directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, backupFileName);

    // Generate SQL dump using pg_dump-like functionality
    const tables = ['users', 'stations', 'sales_data', 'complaints', 'work_permits'];
    let backupSQL = `-- Database backup created on ${new Date().toISOString()}\n\n`;

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT * FROM ${table} ORDER BY id`);
        if (result.rows.length > 0) {
          backupSQL += `-- Table: ${table}\n`;
          backupSQL += `DELETE FROM ${table};\n`;

          for (const row of result.rows) {
            const columns = Object.keys(row);
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              if (typeof value === 'object') return `'${JSON.stringify(value)}'`;
              return value;
            });

            backupSQL += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
          }
          backupSQL += '\n';
        }
      } catch (tableError) {
        console.error(`Error backing up table ${table}:`, tableError);
      }
    }

    // Write backup file
    fs.writeFileSync(backupPath, backupSQL);

    // Get file stats
    const stats = fs.statSync(backupPath);

    res.json({
      message: 'Database backup created successfully',
      backup_file: backupFileName,
      file_path: backupPath,
      file_size: `${(stats.size / 1024).toFixed(2)} KB`,
      tables_backed_up: tables.length,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getBackupFiles = async (req, res) => {
  try {
    const backupDir = path.join(process.cwd(), 'backups');

    if (!fs.existsSync(backupDir)) {
      return res.json({ backups: [] });
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          file_name: file,
          file_path: filePath,
          file_size: `${(stats.size / 1024).toFixed(2)} KB`,
          created_at: stats.birthtime.toISOString(),
          modified_at: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ backups: files });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const downloadBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = path.join(process.cwd(), 'backups', filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ message: 'Backup file not found' });
    }

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(backupPath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = path.join(process.cwd(), 'backups', filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ message: 'Backup file not found' });
    }

    fs.unlinkSync(backupPath);

    res.json({ message: 'Backup file deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const optimizeDatabase = async (req, res) => {
  try {
    const results = {};

    // VACUUM ANALYZE all tables
    const tables = ['users', 'stations', 'sales_data', 'complaints', 'work_permits'];

    for (const table of tables) {
      try {
        await pool.query(`VACUUM ANALYZE ${table}`);
        results[table] = 'Optimized successfully';
      } catch (error) {
        results[table] = `Error: ${error.message}`;
      }
    }

    // Get updated statistics
    const statsResult = await pool.query(`
      SELECT
        schemaname,
        tablename,
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        n_live_tup,
        n_dead_tup
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
    `);

    res.json({
      message: 'Database optimization completed',
      table_results: results,
      statistics: statsResult.rows,
      optimized_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const importStationsAndSales = async (req, res) => {
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
      if (!row.Names || row.Location === undefined || row.Location === null || row.Location === '') {
        return res.status(400).json({
          message: `Invalid data format in Excel file. Missing or empty Names or Location for row: ${JSON.stringify(row)}. Expected format: Names: "Station Name", Location: "-1.940685,30.046401"`
        });
      }

      // Parse location coordinates (format: "latitude,longitude")
      const locationStr = row.Location.toString().trim();

      // Check if it's a valid coordinate format
      if (!locationStr.includes(',')) {
        return res.status(400).json({
          message: `Invalid location format: "${locationStr}". Expected format: "latitude,longitude" (e.g., "-1.940685,30.046401"). Location cannot be just a number like 0.`
        });
      }

      const coordinates = locationStr.split(',').map(coord => parseFloat(coord.trim()));

      if (coordinates.length !== 2 || coordinates.some(isNaN)) {
        return res.status(400).json({
          message: `Invalid coordinate values in location: "${locationStr}". Expected format: "latitude,longitude" with valid numbers (e.g., "-1.940685,30.046401")`
        });
      }

      const [latitude, longitude] = coordinates;

      // Validate that coordinates can be negative (as requested by user)
      if (latitude > 90 || latitude < -90 || longitude > 180 || longitude < -180) {
        return res.status(400).json({
          message: `Invalid coordinates: ${latitude}, ${longitude}. Latitude must be between -90 and 90, longitude between -180 and 180`
        });
      }

      const locationJson = {
        latitude,
        longitude,
        coordinates: `${latitude},${longitude}`
      };

      // Create station first
      const stationResult = await pool.query(
        'INSERT INTO stations (name, location, manager_id) VALUES ($1, $2, $3) RETURNING *',
        [row.Names.toString().trim(), JSON.stringify(locationJson), null] // manager_id = null initially
      );

      const station = stationResult.rows[0];

      // Check if we have sales data columns
      const salesColumns = ['PMS Average Monthly sales AGO Average monthly sales', 'LPG Average monthly sales kg'];
      const hasSalesData = salesColumns.some(col => row[col] !== undefined && row[col] !== null && row[col] !== '');

      if (hasSalesData) {
        // Parse sales data - handle different column naming patterns
        let pmsSales = 0;
        let agoSales = 0;
        let lpgSales = 0;

        // Check for PMS sales
        if (row['PMS Average Monthly sales AGO Average monthly sales'] !== undefined) {
          const pmsValue = parseFloat(row['PMS Average Monthly sales AGO Average monthly sales']);
          if (!isNaN(pmsValue)) {
            pmsSales = pmsValue;
          }
        }

        // Check for AGO sales (might be in the same column or separate)
        if (row['PMS Average Monthly sales AGO Average monthly sales'] !== undefined) {
          const agoValue = parseFloat(row['PMS Average Monthly sales AGO Average monthly sales']);
          if (!isNaN(agoValue)) {
            agoSales = agoValue; // For now, assume AGO is same as PMS if in same column
          }
        }

        // Check for LPG sales
        if (row['LPG Average monthly sales kg'] !== undefined) {
          const lpgValue = parseFloat(row['LPG Average monthly sales kg']);
          if (!isNaN(lpgValue)) {
            lpgSales = lpgValue;
          }
        }

        // Insert average monthly sales data
        if (pmsSales > 0 || agoSales > 0 || lpgSales > 0) {
          await pool.query(
            'INSERT INTO sales_data (station_id, date, pms_sales, ago_sales, lpg_sales) VALUES ($1, CURRENT_DATE, $2, $3, $4)',
            [station.id, pmsSales, agoSales, lpgSales]
          );
        }
      }

      results.push({
        station: station,
        sales_data: hasSalesData ? {
          pms_sales: row['PMS Average Monthly sales AGO Average monthly sales'] || 0,
          ago_sales: row['PMS Average Monthly sales AGO Average monthly sales'] || 0,
          lpg_sales: row['LPG Average monthly sales kg'] || 0
        } : null
      });
    }

    res.status(201).json({
      message: `Successfully imported ${results.length} stations`,
      results: results
    });
  } catch (error) {
    console.error('Error importing stations and sales:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};