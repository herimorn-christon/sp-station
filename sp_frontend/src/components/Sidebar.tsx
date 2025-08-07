import React from 'react';
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
  LogOut
} from 'lucide-react';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';

const Sidebar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

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
        return { icon: Shield, label: 'Administrator', color: 'text-red-600' };
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
    <div className="flex">
      <div className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0 overflow-y-auto
                hidden md:flex flex-col justify-between z-40">
        <div>
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">PT</span>
              </div>
              <span className="font-bold text-xl text-gray-800">SP Station</span>
            </div>

            {/* User Info */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <RoleIcon className={`h-8 w-8 ${roleInfo.color}`} />
                <div>
                  <p className="font-semibold text-gray-800">{user?.name}</p>
                  <p className={`text-sm font-medium ${roleInfo.color}`}>
                    {roleInfo.label}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>

            <nav className="space-y-2">
              {getNavigationItems().map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-red-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
        {/* Logout button at the bottom */}
        <div className="p-4 border-t">
          <button
            className="w-full flex items-center space-x-2 px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span className="flex-1 text-left">Logout</span>
          </button>
        </div>
      </div>
      <main className="flex-1 ml-64 p-4">
        {/* Main content here */}
      </main>
    </div>
  );
};

export default Sidebar;