export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'station_manager' | 'operations' | 'unicorn' | 'trident';
  created_at: string;
}

export interface Station {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  manager_id: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  station_id: string;
  station_name: string;
  title: string;
  description: string;
  complaint_type: 'fuel' | 'lpg';
  severity_level: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  requires_work_permit: boolean;
  image_url: string[] | null;
  video_url: string | null;
  status: 'sent' | 'in_progress' | 'unicorn_assigned' | 'unicorn_received' | 'trident_assigned' | 'trident_received' | 'solved';
  repair_report_url?: string;
  completion_notes?: string;
  emergency_override: boolean;
  override_reason?: string;
  unicorn_id?: string;
  trident_id?: string;
  unicorn_name?: string;
  trident_name?: string;
  assigned_to_unicorn: boolean;
  assigned_to_trident: boolean;
  unicorn_received_at?: string;
  trident_received_at?: string;
  repair_type: 'inhouse' | 'unicorn' | 'trident';
  priority: 'low' | 'medium' | 'high';
  work_started_at?: string;
  work_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesData {
  id: string;
  station_id: string;
  date: string;
  pms_sales: number;
  ago_sales: number;
  lpg_sales: number;
  created_at: string;
}

export interface WorkPermit {
  id: string;
  complaint_id: string;
  complaint_title?: string;
  permit_number: string;
  permit_type: string;
  work_description: string;
  risk_assessment?: string;
  required_safety_ppe: string;
  required_precautions: string;
  work_details?: string;
  layout_sketch?: string;
  custom_requirements?: string;
  rejection_reason?: string;
  estimated_duration_hours?: number;
  valid_from: string;
  valid_until: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  created_by_name?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface RootState {
  auth: AuthState;
}