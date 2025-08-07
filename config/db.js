import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'advabill123',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 4545,
  database: process.env.DB_NAME || 'sp_stations'
});

export default pool;