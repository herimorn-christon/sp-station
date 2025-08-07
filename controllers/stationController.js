import pool from '../config/db.js';

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