import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Routes
import userRoutes from './routes/userRoutes.js';
import stationRoutes from './routes/stationRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import workPermitRoutes from './routes/workPermitRoutes.js';
import systemRoutes from './routes/systemRoutes.js';


dotenv.config();
const app = express();
const PORT = process.env.PORT || 6000;
const HOST = process.env.HOST || '0.0.0.0';
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload folders exist
const uploadDirs = [
  path.join('uploads'),
  path.join('uploads', 'images'),
  path.join('uploads', 'videos')
];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve static files from uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(process.cwd(), 'sp_frontend', 'dist');

  // Serve static files from frontend build directory
  app.use(express.static(frontendDistPath));

  // Handle React Router - serve index.html for all non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Initialize database tables and default users
async function initializeTables() {
  try {
    // Check if tables already exist
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    // Only initialize if tables don't exist
    if (!tableExists.rows[0].exists) {
      // Create users table with unicorn and trident roles
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'station_manager', 'operations', 'unicorn', 'trident')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create stations table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS stations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          location JSONB NOT NULL,
          manager_id UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create complaints table with both unicorn and trident fields
      await pool.query(`
        CREATE TABLE IF NOT EXISTS complaints (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          station_id UUID REFERENCES stations(id),
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          complaint_type VARCHAR(20) CHECK (complaint_type IN ('fuel', 'lpg')) DEFAULT 'fuel',
          severity_level VARCHAR(20) CHECK (severity_level IN ('low', 'medium', 'high', 'critical', 'emergency')) DEFAULT 'medium',
          requires_work_permit BOOLEAN DEFAULT FALSE,
          image_url TEXT[],
          video_url TEXT[],
          status VARCHAR(30) NOT NULL CHECK (status IN ('sent', 'in_progress', 'unicorn_assigned', 'unicorn_received', 'trident_assigned', 'trident_received', 'solved')) DEFAULT 'sent',
          repair_report_url TEXT,
          completion_notes TEXT,
          emergency_override BOOLEAN DEFAULT FALSE,
          override_reason TEXT,
          unicorn_id UUID REFERENCES users(id),
          trident_id UUID REFERENCES users(id),
          assigned_to_unicorn BOOLEAN DEFAULT FALSE,
          assigned_to_trident BOOLEAN DEFAULT FALSE,
          unicorn_received_at TIMESTAMP WITH TIME ZONE,
          trident_received_at TIMESTAMP WITH TIME ZONE,
          repair_type VARCHAR(20) CHECK (repair_type IN ('inhouse', 'unicorn', 'trident')),
          priority VARCHAR(20) DEFAULT 'medium',
          work_started_at TIMESTAMP WITH TIME ZONE,
          work_completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create work_permits table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS work_permits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          complaint_id UUID REFERENCES complaints(id),
          permit_number VARCHAR(50) UNIQUE,
          permit_type VARCHAR(100) NOT NULL,
          work_description TEXT NOT NULL,
          risk_assessment TEXT,
          required_safety_ppe JSONB NOT NULL DEFAULT '[]',
          required_precautions JSONB NOT NULL DEFAULT '[]',
          work_details TEXT,
          layout_sketch TEXT,
          custom_requirements TEXT,
          rejection_reason TEXT,
          estimated_duration_hours INTEGER,
          valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          valid_until TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
          status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
          created_by UUID REFERENCES users(id),
          created_by_name VARCHAR(255),
          approved_by UUID REFERENCES users(id),
          approved_by_name VARCHAR(255),
          approved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Generate permit numbers function
      await pool.query(`
        CREATE OR REPLACE FUNCTION generate_permit_number()
        RETURNS TEXT AS $$
        DECLARE
          permit_num TEXT;
        BEGIN
          SELECT 'WP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
                 LPAD((COALESCE(MAX(CAST(SUBSTRING(permit_number FROM 9) AS INTEGER)), 0) + 1)::TEXT, 4, '0')
          INTO permit_num
          FROM work_permits 
          WHERE permit_number LIKE 'WP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
          
          RETURN permit_num;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Trigger to auto-generate permit numbers
      await pool.query(`
        CREATE OR REPLACE FUNCTION set_permit_number()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.permit_number IS NULL THEN
            NEW.permit_number := generate_permit_number();
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await pool.query(`
        DROP TRIGGER IF EXISTS trigger_set_permit_number ON work_permits;
        CREATE TRIGGER trigger_set_permit_number
          BEFORE INSERT ON work_permits
          FOR EACH ROW
          EXECUTE FUNCTION set_permit_number();
      `);

      // Create sales_data table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sales_data (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          station_id UUID REFERENCES stations(id),
          date DATE NOT NULL,
          pms_sales NUMERIC NOT NULL,
          ago_sales NUMERIC NOT NULL,
          lpg_sales NUMERIC NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Insert only admin user
      const adminUser = {
        name: 'Technical',
        email: 'technical@gmail.com',
        password: 'technical123',
        role: 'admin'
      };

      const hashedPassword = await bcrypt.hash(adminUser.password, 10);
      const result = await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id',
        [adminUser.name, adminUser.email, hashedPassword, adminUser.role]
      );

      if (result.rows.length > 0) {
        console.log('Admin user initialized successfully');
      } else {
        console.log('Admin user already exists');
      }
    } else {
      // Update existing tables with missing columns
      const columnsToAdd = [
        {
          table: 'complaints',
          column: 'complaint_type',
          definition: 'VARCHAR(20) CHECK (complaint_type IN (\'fuel\', \'lpg\')) DEFAULT \'fuel\''
        },
        {
          table: 'complaints',
          column: 'completion_notes',
          definition: 'TEXT'
        },
        {
          table: 'complaints',
          column: 'emergency_override',
          definition: 'BOOLEAN DEFAULT FALSE'
        },
        {
          table: 'complaints',
          column: 'override_reason',
          definition: 'TEXT'
        },
        {
          table: 'complaints',
          column: 'severity_level',
          definition: 'VARCHAR(20) CHECK (severity_level IN (\'low\', \'medium\', \'high\', \'critical\', \'emergency\')) DEFAULT \'medium\''
        },
        {
          table: 'complaints',
          column: 'unicorn_id',
          definition: 'UUID REFERENCES users(id)'
        },
        {
          table: 'complaints',
          column: 'trident_id',
          definition: 'UUID REFERENCES users(id)'
        },
        {
          table: 'complaints',
          column: 'assigned_to_unicorn',
          definition: 'BOOLEAN DEFAULT FALSE'
        },
        {
          table: 'complaints',
          column: 'assigned_to_trident',
          definition: 'BOOLEAN DEFAULT FALSE'
        },
        {
          table: 'complaints',
          column: 'unicorn_received_at',
          definition: 'TIMESTAMP WITH TIME ZONE'
        },
        {
          table: 'complaints',
          column: 'trident_received_at',
          definition: 'TIMESTAMP WITH TIME ZONE'
        },
        {
          table: 'complaints',
          column: 'repair_type',
          definition: 'VARCHAR(20) CHECK (repair_type IN (\'inhouse\', \'unicorn\', \'trident\'))'
        },
        {
          table: 'complaints',
          column: 'requires_work_permit',
          definition: 'BOOLEAN DEFAULT FALSE'
        },
        {
          table: 'complaints',
          column: 'priority',
          definition: 'VARCHAR(20) DEFAULT \'medium\''
        },
        {
          table: 'complaints',
          column: 'work_started_at',
          definition: 'TIMESTAMP WITH TIME ZONE'
        },
        {
          table: 'complaints',
          column: 'work_completed_at',
          definition: 'TIMESTAMP WITH TIME ZONE'
        },
        {
          table: 'work_permits',
          column: 'permit_number',
          definition: 'VARCHAR(50) UNIQUE'
        },
        {
          table: 'work_permits',
          column: 'created_by_name',
          definition: 'VARCHAR(255)'
        },
        {
          table: 'work_permits',
          column: 'approved_by_name',
          definition: 'VARCHAR(255)'
        },
        {
          table: 'work_permits',
          column: 'valid_from',
          definition: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
        },
        {
          table: 'work_permits',
          column: 'valid_until',
          definition: 'TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL \'7 days\')'
        },
        {
          table: 'work_permits',
          column: 'estimated_duration_hours',
          definition: 'INTEGER'
        },
        {
          table: 'work_permits',
          column: 'station_id',
          definition: 'UUID REFERENCES stations(id)'
        },
        {
          table: 'work_permits',
          column: 'title',
          definition: 'VARCHAR(255)'
        }
      ];

      // Add missing columns
      for (const col of columnsToAdd) {
        await pool.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='${col.table}' AND column_name='${col.column}'
            ) THEN
              ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.definition};
            END IF;
          END
          $$;
        `);
      }

      // Update status column to include trident statuses
      await pool.query(`
        DO $$
        BEGIN
          ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
          ALTER TABLE complaints ADD CONSTRAINT complaints_status_check 
            CHECK (status IN ('sent', 'in_progress', 'unicorn_assigned', 'unicorn_received', 'trident_assigned', 'trident_received', 'solved'));
        EXCEPTION
          WHEN duplicate_object THEN
            NULL;
        END $$;
      `);

      // Update role column to include trident role
      await pool.query(`
        DO $$
        BEGIN
          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
          ALTER TABLE users ADD CONSTRAINT users_role_check 
            CHECK (role IN ('admin', 'station_manager', 'operations', 'unicorn', 'trident'));
        EXCEPTION
          WHEN duplicate_object THEN
            NULL;
        END $$;
      `);

      // Ensure permit number generation function exists
      await pool.query(`
        CREATE OR REPLACE FUNCTION generate_permit_number()
        RETURNS TEXT AS $$
        DECLARE
          permit_num TEXT;
        BEGIN
          SELECT 'WP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
                 LPAD((COALESCE(MAX(CAST(SUBSTRING(permit_number FROM 9) AS INTEGER)), 0) + 1)::TEXT, 4, '0')
          INTO permit_num
          FROM work_permits 
          WHERE permit_number LIKE 'WP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
          
          RETURN permit_num;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Trigger to auto-generate permit numbers
      await pool.query(`
        CREATE OR REPLACE FUNCTION set_permit_number()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.permit_number IS NULL THEN
            NEW.permit_number := generate_permit_number();
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await pool.query(`
        DROP TRIGGER IF EXISTS trigger_set_permit_number ON work_permits;
        CREATE TRIGGER trigger_set_permit_number
          BEFORE INSERT ON work_permits
          FOR EACH ROW
          EXECUTE FUNCTION set_permit_number();
      `);

      console.log('Database tables already exist, ensured all required columns are present');
    }
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
}

// Initialize tables and default users on server start
initializeTables();

// Routes
app.use('/api/users', userRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/work-permits', workPermitRoutes);
app.use('/api/system', systemRoutes);

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});