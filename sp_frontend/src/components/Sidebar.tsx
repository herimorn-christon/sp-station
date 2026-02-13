import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Home,
  Users,
  MapPin,
  AlertCircle,
  BarChart3,
  Settings as SettingsIcon,
  Shield,
  Flame,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { Station } from '../types';
import { api } from '../services/api';

const Sidebar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [managedStation, setManagedStation] = useState<Station | null>(null);

  useEffect(() => {
    const fetchManagedStation = async () => {
      if (user?.role === 'station_manager') {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;

          const stations = await api.get<Station[]>('/stations', token);
          const userStation = stations.find(station => station.manager_id === user?.id);
          if (userStation) {
            setManagedStation(userStation);
          }
        } catch (error) {
          console.error('Error fetching managed station:', error);
        }
      }
    };

    fetchManagedStation();
  }, [user?.id, user?.role]);

  const getNavigationItems = () => {
    const baseItems = [
      {
        to: '/',
        icon: Home,
        label: 'Dashboard',
        roles: ['admin', 'station_manager', 'operations', 'unicorn', 'trident']
      }
    ];

    const roleSpecificItems = [
      // Admin
      { to: '/users', icon: Users, label: 'Users', roles: ['admin'] },
      { to: '/stations', icon: MapPin, label: 'Stations', roles: ['admin'] },

      // Complaints for all except unicorn/trident
      { to: '/complaints', icon: AlertCircle, label: 'Complaints', roles: ['admin', 'station_manager', 'operations'] },
      // Sales for station manager
      { to: '/sales', icon: BarChart3, label: 'Sales Reports', roles: ['station_manager'] },
      // Station Map for admin/operations
      { to: '/station-map', icon: MapPin, label: 'Station Map', roles: ['admin', 'operations'] },
      // Settings for all
      { to: '/settings', icon: SettingsIcon, label: 'Settings', roles: ['admin', 'station_manager', 'operations', 'unicorn', 'trident'] },
      // Profile for all
      { to: '/profile', icon: Users, label: 'User-Profile', roles: ['admin', 'station_manager', 'operations', 'unicorn', 'trident'] }
    ];

    return [...baseItems, ...roleSpecificItems].filter(
      item => item.roles.includes(user?.role || '')
    );
  };

  const getRoleInfo = () => {
    switch (user?.role) {
      case 'admin':
        return { icon: Shield, label: 'Technical', color: 'text-red-600' };
      case 'station_manager':
        return { icon: MapPin, label: 'Station Manager', color: 'text-blue-600' };
      case 'operations':
        return { icon: AlertCircle, label: 'Operations', color: 'text-green-600' };
      case 'unicorn':
        return { icon: Shield, label: 'Unicorn Tech', color: 'text-purple-600' };
      case 'trident':
        return { icon: Flame, label: 'Trident Tech', color: 'text-orange-600' };
      default:
        return { icon: Users, label: 'User', color: 'text-gray-600' };
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const roleInfo = getRoleInfo();
  const RoleIcon = roleInfo.icon;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-form shadow-form-lg border border-secondary-200"
      >
        <Menu className="h-6 w-6 text-secondary-700" />
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        bg-white shadow-xl border-r border-secondary-200 h-screen overflow-y-auto transition-all duration-300 ease-in-out z-50
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:h-full
        w-80 sm:w-72 md:w-64 lg:w-72
        fixed left-0 top-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-secondary-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-400 flex items-center justify-center relative overflow-hidden">
                  <span className="text-cyan-400 font-bold text-sm sm:text-base relative z-10">S</span>
                  <span className="text-yellow-500 font-bold text-sm sm:text-base relative z-10 ml-0.5">P</span>
                </div>
                <span className="font-bold text-lg sm:text-xl text-secondary-800">
                  {user?.role === 'station_manager' && managedStation ? `SP ${managedStation.name}` : 'SP Station'}
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1 rounded-form hover:bg-secondary-100"
              >
                <X className="h-5 w-5 text-secondary-600" />
              </button>
            </div>

            {/* User Info */}
            <div className="mb-6 p-3 sm:p-4 bg-secondary-50 rounded-form">
              <div className="flex items-center space-x-3">
                <RoleIcon className={`h-8 w-8 sm:h-10 sm:w-10 ${roleInfo.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-secondary-800 text-sm sm:text-base truncate">{user?.name}</p>
                  <p className={`text-xs sm:text-sm font-medium ${roleInfo.color}`}>
                    {roleInfo.label}
                  </p>
                  <p className="text-xs text-secondary-500 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 sm:px-6 pb-6">
            <div className="space-y-1 sm:space-y-2">
              {getNavigationItems().map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-form transition-all duration-200 touch-manipulation ${
                        isActive
                          ? 'bg-primary-600 text-white shadow-form'
                          : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-800'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium text-sm sm:text-base">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </nav>

          {/* Logout button */}
          <div className="p-4 sm:p-6 border-t border-secondary-200">
            <button
              className="w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-form bg-primary-600 text-white hover:bg-primary-700 transition-all duration-200 touch-manipulation shadow-form"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Spacer */}
      <div className="md:hidden flex-1" />
    </>
  );
};

export default Sidebar;