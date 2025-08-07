import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Settings, FileSpreadsheet, MapPin } from 'lucide-react';
import { api } from '../../services/api';
import StationMap from '../StationMap';

interface DashboardStats {
  totalUsers: number;
  totalStations: number;
  totalSales: number;
  systemStatus: string;
}

const AdminDashboard: React.FC = () => {
  const [complaintsData, setComplaintsData] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalStations: 0,
    totalSales: 0,
    systemStatus: 'operational',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No auth token');

        const [complaints, dashboardStats] = await Promise.all([
          api.get<any[]>('/complaints', token), // Fetch complaints data
          api.get<DashboardStats>('/dashboard/stats', token), // Fetch dashboard stats
        ]);

        setComplaintsData(complaints);
        setStats(dashboardStats);
      } catch (err) {
        setError('Failed to fetch dashboard data');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Prepare data for the bar chart
  const complaintsChartData = complaintsData.reduce((acc, complaint) => {
    const station = acc.find((item) => item.station_name === complaint.station_name);
    if (station) {
      station.total += 1;
      if (complaint.status !== 'solved') {
        station.active += 1;
      } else {
        station.resolved += 1;
      }
    } else {
      acc.push({
        station_name: complaint.station_name,
        total: 1,
        active: complaint.status !== 'solved' ? 1 : 0,
        resolved: complaint.status === 'solved' ? 1 : 0,
      });
    }
    return acc;
  }, [] as { station_name: string; total: number; active: number; resolved: number }[]);

  if (loading) return <div>Loading dashboard data...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-4">
            <Users className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-black">User Management</h3>
              <p className="text-gray-600">{stats.totalUsers} Active Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-4">
            <MapPin className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-black">Stations</h3>
              <p className="text-gray-600">{stats.totalStations} Locations</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-4">
            <FileSpreadsheet className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-black">Sales Data</h3>
              <p className="text-gray-600">Rwf {stats.totalSales.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-4">
            <Settings className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-black">System Status</h3>
              <p className="text-gray-600">{stats.systemStatus}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Complaints Analytics Overview */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-black">Complaints Analytics Overview</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={complaintsChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="station_name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill="#8884d8" name="Total Complaints" />
            <Bar dataKey="active" fill="#f56565" name="Active Complaints" />
            <Bar dataKey="resolved" fill="#48bb78" name="Resolved Complaints" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Station Locations Map */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-black">Station Locations</h2>
        <StationMap />
      </div>
    </div>
  );
};

export default AdminDashboard;