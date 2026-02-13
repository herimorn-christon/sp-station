import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';

// Get system statistics
export const getSystemStats = async (req, res) => {
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

// Create database backup
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

// Get list of backup files
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

// Download backup file
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

// Delete backup file
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

// Optimize database
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

// Get system health status
export const getSystemHealth = async (req, res) => {
  try {
    const health = {
      database: 'unknown',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    // Check database connectivity
    try {
      await pool.query('SELECT 1');
      health.database = 'connected';
    } catch (error) {
      health.database = 'disconnected';
      health.database_error = error.message;
    }

    // Check available disk space for backups
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const stats = fs.statvfsSync ? fs.statvfsSync(backupDir) : { f_bavail: 0, f_frsize: 1 };
    const availableSpace = (stats.f_bavail * stats.f_frsize) / (1024 * 1024 * 1024); // GB

    health.disk_space = {
      available_gb: Math.round(availableSpace * 100) / 100,
      backup_directory: backupDir
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};