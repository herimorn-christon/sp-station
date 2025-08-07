import React, { useState, useEffect } from 'react';
import { Settings, MapPin, Users, Save, Building } from 'lucide-react';
import { useSelector } from 'react-redux';
import { api } from '../../services/api';
import { Station } from '../../types';
import { RootState } from '../../store';

const StationSettings: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    alerts: {
      lowStock: true,
      maintenance: true,
      salesReport: true,
    },
  });

  useEffect(() => {
    const fetchStation = async () => {
      if (!user) return;

      try {
        const token = localStorage.getItem('token');
        const stations = await api.get<Station[]>('/stations', token);
        const userStation = stations.find((s) => s.manager_id === user.id);
        if (userStation) {
          setStation(userStation);
        }
      } catch (err) {
        setError('Failed to fetch station data');
      } finally {
        setLoading(false);
      }
    };

    fetchStation();
  }, [user]);

  const handleSave = () => {
    // TODO: Implement settings save functionality
    alert('Settings saved successfully!');
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!station) return <div>No station assigned</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-800">Station Settings</h2>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          <Save className="h-5 w-5" />
          <span>Save Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Station Information */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-2 mb-4">
            <Building className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold">Station Information</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Station Name</label>
              <input
                type="text"
                value={station.name}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Latitude</label>
                <input
                  type="text"
                  value={station.location.latitude}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Longitude</label>
                <input
                  type="text"
                  value={station.location.longitude}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold">Alert Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Low Stock Alerts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alerts.lowStock}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      alerts: { ...settings.alerts, lowStock: !settings.alerts.lowStock },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Maintenance Reminders</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alerts.maintenance}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      alerts: { ...settings.alerts, maintenance: !settings.alerts.maintenance },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Sales Report Notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alerts.salesReport}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      alerts: { ...settings.alerts, salesReport: !settings.alerts.salesReport },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationSettings;