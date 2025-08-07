import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';

import AdminDashboard from './dashboards/AdminDashboard';
import ManagerDashboard from './dashboards/ManagerDashboard';
import OperationsDashboard from './dashboards/OperationsDashboard';
import UnicornDashboard from './dashboards/UnicornDashboard';
import TridentDashboard from './dashboards/TridentDashboard';

import UsersManagement from './admin/UsersManagement';
import Settings from './admin/Settings';
import StationsManagement from './admin/StationsManagement';

import ComplaintsManager from './manager/ComplaintsManager';
import StationSettings from './manager/StationSettings';

import ComplaintsOperations from './operations/ComplaintsOperations';
import StationMap from './operations/StationMap';
import OperationsReports from './operations/OperationsReports';

import Sidebar from './Sidebar';
import Profile from './Profile';

const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  if (!user) return null;

  const getDashboardRoutes = () => {
    switch (user.role) {
      case 'admin':
        return (
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/users" element={<UsersManagement />} />
            <Route path="/complaints" element={<ComplaintsOperations />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/stations" element={<StationsManagement />} />
            <Route path="/station-map" element={<StationMap />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        );
      case 'station_manager':
        return (
          <Routes>
            <Route path="/" element={<ManagerDashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/complaints" element={<ComplaintsManager />} />
            <Route path="/station-settings" element={<StationSettings />} />
          </Routes>
        );
      case 'operations':
        return (
          <Routes>
            <Route path="/" element={<OperationsDashboard />} />
            <Route path="/complaints" element={<ComplaintsOperations />} />
            <Route path="/station-map" element={<StationMap />} />
            <Route path="/reports" element={<OperationsReports />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        );
      case 'unicorn':
        return (
          <Routes>
            <Route path="/" element={<UnicornDashboard />} />
            <Route path="/complaints" element={<UnicornDashboard />} />
            <Route path="/work-permits" element={<UnicornDashboard />} />
            <Route path="/assignments" element={<UnicornDashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        );
      case 'trident':
        return (
          <Routes>
            <Route path="/" element={<TridentDashboard />} />
            <Route path="/complaints" element={<TridentDashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="relative pb-2">
                  <h1 className="text-xl font-bold text-black">
                    Station Management System
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8 bg-gray-50">
          {getDashboardRoutes()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
