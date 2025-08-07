import pool from '../config/db.js';

export const createComplaint = async (req, res) => {
  try {
    const {
      station_id,
      title,
      description, // Use description directly
      priority = 'medium',
      complaint_type = 'fuel'
    } = req.body;

    // Prepare file URLs/paths (optional)
    let video_url = null;
    let image_url = null;

    // Handle video (optional, must be at least 50MB if present)
    if (req.files && req.files.video_url && req.files.video_url.length > 0) {
      if (req.files.video_url[0].size < 50 * 1024 * 1024) {
        return res.status(400).json({ message: 'Video must be at least 50MB.' });
      }
      video_url = req.files.video_url[0].path;
    }

    // Handle images (optional, can be multiple)
    if (req.files && req.files.image_url && req.files.image_url.length > 0) {
      image_url = req.files.image_url.map(img => img.path);
    }

    // Use a default description if missing
    const finalDescription = description && description.trim() !== ''
      ? description
      : 'No description provided';

    // Verify station exists
    const stationCheck = await pool.query('SELECT id FROM stations WHERE id = $1', [station_id]);
    if (stationCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Station not found' });
    }

    // Verify user is the manager of this station
    const managerCheck = await pool.query(
      'SELECT id FROM stations WHERE id = $1 AND manager_id = $2',
      [station_id, req.user.id]
    );
    if (managerCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You are not authorized to create complaints for this station' });
    }

    // Insert complaint (pass image_url as array, not string)
    const result = await pool.query(
      'INSERT INTO complaints (station_id, title, video_url, image_url, description, priority, complaint_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        station_id,
        title,
        video_url,
        image_url || null, // Pass array or null
        finalDescription,
        priority,
        complaint_type
      ]
    );

    console.log('Complaint created:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getComplaints = async (req, res) => {
  try {
    let query = `
      SELECT c.*, s.name as station_name, u.name as unicorn_name, t.name as trident_name
      FROM complaints c 
      JOIN stations s ON c.station_id = s.id 
      LEFT JOIN users u ON c.unicorn_id = u.id
      LEFT JOIN users t ON c.trident_id = t.id
    `;

    // If user is a station manager, only show their complaints
    if (req.user.role === 'station_manager') {
      query += ' WHERE s.manager_id = $1';
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(
      query,
      req.user.role === 'station_manager' ? [req.user.id] : []
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting complaints:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, repair_report_url } = req.body;

    // Verify complaint exists
    const complaintCheck = await pool.query(
      'SELECT c.*, s.manager_id FROM complaints c JOIN stations s ON c.station_id = s.id WHERE c.id = $1',
      [id]
    );
    if (complaintCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    let updateQuery = 'UPDATE complaints SET status = $1, updated_at = CURRENT_TIMESTAMP';
    let queryParams = [status];
    let paramCount = 1;

    if (repair_report_url) {
      paramCount++;
      updateQuery += `, repair_report_url = $${paramCount}`;
      queryParams.push(repair_report_url);
    }

    if (status === 'solved') {
      paramCount++;
      updateQuery += `, work_completed_at = $${paramCount}`;
      queryParams.push(new Date());
    }

    paramCount++;
    updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
    queryParams.push(id);

    const result = await pool.query(updateQuery, queryParams);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating complaint status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const assignToUnicorn = async (req, res) => {
  try {
    const { id } = req.params;
    const { unicorn_id, requires_work_permit } = req.body;

    const result = await pool.query(
      `UPDATE complaints SET 
        status = 'unicorn_assigned', 
        unicorn_id = $1, 
        assigned_to_unicorn = true,
        requires_work_permit = $2,
        repair_type = 'unicorn',
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3 RETURNING *`,
      [unicorn_id, requires_work_permit || false, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning to unicorn:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const assignToTrident = async (req, res) => {
  try {
    const { id } = req.params;
    const { trident_id, requires_work_permit } = req.body;

    const result = await pool.query(
      `UPDATE complaints SET 
        status = 'trident_assigned', 
        trident_id = $1, 
        assigned_to_trident = true,
        requires_work_permit = $2,
        repair_type = 'trident',
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3 RETURNING *`,
      [trident_id, requires_work_permit || false, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning to trident:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const markInHouseRepair = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE complaints SET 
        status = 'in_progress', 
        repair_type = 'inhouse',
        requires_work_permit = false,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking in-house repair:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const unicornReceiveComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE complaints SET 
        status = 'unicorn_received', 
        unicorn_received_at = CURRENT_TIMESTAMP,
        work_started_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND unicorn_id = $2 RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Complaint not found or not assigned to you' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error receiving complaint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const tridentReceiveComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE complaints SET 
        status = 'trident_received', 
        trident_received_at = CURRENT_TIMESTAMP,
        work_started_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND trident_id = $2 RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Complaint not found or not assigned to you' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error receiving complaint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};