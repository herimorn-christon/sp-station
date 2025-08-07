import pool from '../config/db.js';

export const createWorkPermit = async (req, res) => {
  console.log('Creating work permit with body:', req.body);
  try {
    const {
      complaint_id, // <-- use this
      title,
      work_description,
      permit_type,
      risk_assessment,
      required_safety_ppe,
      required_precautions,
      work_details,
      layout_sketch,
      custom_requirements,
      estimated_duration_hours
    } = req.body;

    // Provide a default description if not present
    const finalWorkDescription = work_description && work_description.trim() !== ''
      ? work_description
      : 'No description provided';

    // Verify complaint exists and user has permission
    const complaintCheck = await pool.query(
      'SELECT c.*, s.manager_id FROM complaints c JOIN stations s ON c.station_id = s.id WHERE c.id = $1',
      [complaint_id]
    );

    if (complaintCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const complaint = complaintCheck.rows[0];
    const station_id = complaint.station_id; // always use this!

    // Only station managers can create work permits for their station's complaints
    // Or operations/admin can create permits for any complaint
    if (req.user.role === 'station_manager' && complaint.manager_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only create work permits for your station\'s complaints' });
    }

    if (!['station_manager', 'operations', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only station managers, operations, or admin can create work permits' });
    }

    // Generate permit number
    const permitNumberResult = await pool.query(`
      SELECT 'WP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
             LPAD((COALESCE(MAX(CAST(SUBSTRING(permit_number FROM 9) AS INTEGER)), 0) + 1)::TEXT, 4, '0') as permit_number
      FROM work_permits 
      WHERE permit_number LIKE 'WP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%'
    `);

    const permit_number = permitNumberResult.rows[0].permit_number;

    const result = await pool.query(
      `INSERT INTO work_permits (
        complaint_id, station_id, title, work_description, permit_number, permit_type, risk_assessment,
        required_safety_ppe, required_precautions, work_details, layout_sketch,
        custom_requirements, estimated_duration_hours, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        complaint_id,
        station_id, // from complaint.station_id
        title || '', // fallback to empty string if not provided
        finalWorkDescription,
        permit_number,
        permit_type || '',
        risk_assessment || '',
        JSON.stringify(required_safety_ppe || []),
        JSON.stringify(required_precautions || []),
        work_details || '',
        layout_sketch || '',
        custom_requirements || '',
        estimated_duration_hours || null,
        req.user.id
      ]
    );

    // Update complaint to require work permit
    await pool.query(
      'UPDATE complaints SET requires_work_permit = true WHERE id = $1',
      [station_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating work permit:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getWorkPermits = async (req, res) => {
  try {
    const { complaint_id } = req.params;
    
    let query = `
      SELECT wp.*, c.title as complaint_title, c.station_id,
             creator.name as created_by_name, approver.name as approved_by_name
      FROM work_permits wp
      JOIN complaints c ON wp.complaint_id = c.id
      LEFT JOIN users creator ON wp.created_by = creator.id
      LEFT JOIN users approver ON wp.approved_by = approver.id
    `;
    
    let queryParams = [];
    
    if (complaint_id) {
      query += ' WHERE wp.complaint_id = $1';
      queryParams.push(complaint_id);
    } else {
      // Filter based on user role
      if (req.user.role === 'station_manager') {
        query += ` WHERE c.station_id IN (
          SELECT id FROM stations WHERE manager_id = $1
        )`;
        queryParams.push(req.user.id);
      } else if (req.user.role === 'unicorn') {
        query += ' WHERE wp.created_by = $1 OR c.unicorn_id = $1';
        queryParams.push(req.user.id);
      }
    }
    
    query += ' ORDER BY wp.created_at DESC';
    
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching work permits:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateWorkPermitStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    // Only admin and operations can approve/reject permits
    if (!['admin', 'operations'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    let updateQuery = `
      UPDATE work_permits SET 
        status = $1, 
        updated_at = CURRENT_TIMESTAMP
    `;
    let queryParams = [status];
    let paramCount = 1;

    if (status === 'approved') {
      paramCount++;
      updateQuery += `, approved_by = $${paramCount}, approved_at = CURRENT_TIMESTAMP`;
      queryParams.push(req.user.id);
    }

    if (status === 'rejected' && rejection_reason) {
      paramCount++;
      updateQuery += `, rejection_reason = $${paramCount}`;
      queryParams.push(rejection_reason);
    }

    paramCount++;
    updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
    queryParams.push(id);

    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Work permit not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating work permit status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};