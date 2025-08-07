import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { api } from '../../services/api';
import { Station, User } from '../../types';
import Select from 'react-select';

const StationsManagement: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [stationsPerPage, setStationsPerPage] = useState(10); // Default to 10 items per page

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStation, setNewStation] = useState({
    name: '',
    location: { latitude: 0, longitude: 0 },
    manager_id: ''
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [stationsData, usersData] = await Promise.all([
          api.get<Station[]>('/stations', token),
          api.get<User[]>('/users', token)
        ]);
        setStations(stationsData);
        setManagers(usersData.filter(user => user.role === 'station_manager'));
      } catch (err) {
        setError('Failed to fetch data');
        
        
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter stations based on search query
  const filteredStations = stations.filter((station) => {
    const managerEmail = managers.find((m) => m.id === station.manager_id)?.email || '';
    return (
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${station.location.latitude}, ${station.location.longitude}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      managerEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Pagination logic
  const indexOfLastStation = currentPage * stationsPerPage;
  const indexOfFirstStation = indexOfLastStation - stationsPerPage;
  const currentStations = filteredStations.slice(indexOfFirstStation, indexOfLastStation);

  const totalPages = Math.ceil(filteredStations.length / stationsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = await api.post<Station>('/stations', newStation, token);
      setStations([...stations, data]);
      setShowAddModal(false);
      setNewStation({ name: '', location: { latitude: 0, longitude: 0 }, manager_id: '' });
    } catch (err) {
      setError('Failed to add station');
    }
  };

  const handleUpdateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStation) return;

    try {
      const token = localStorage.getItem('token');
      const updated = await api.put<Station>(
        `/stations/${editingStation.id}`,
        editingStation,
        token
      );
      setStations(stations.map(s => s.id === updated.id ? updated : s));
      setShowEditModal(false);
      setEditingStation(null);
    } catch (err) {
      setError('Failed to update station');
    }
  };

  const handleDeleteStation = async (id: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this station?');
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      await api.delete(`/stations/${id}`, token);
      setStations(stations.filter(s => s.id !== id));
    } catch (err) {
      setError('Failed to delete station');
    }
  };

  // Prepare options for react-select
  const managerOptions = managers.map(manager => ({
    value: manager.id,
    label: manager.email,
  }));

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MapPin className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-800">Stations Management</h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          <Plus className="h-5 w-5" />
          <span>Add Station</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search stations by name, location, or manager"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-50 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      {/* Stations Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Manager
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentStations.map((station) => (
              <tr key={station.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{station.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {station.location.latitude}, {station.location.longitude}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {managers.find(m => m.id === station.manager_id)?.email || 'No manager assigned'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                    onClick={() => {
                      setEditingStation(station);
                      setShowEditModal(true);
                    }}
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-900"
                    onClick={() => handleDeleteStation(station.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-md ${
              currentPage === 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md ${
              currentPage === totalPages
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Next
          </button>
        </div>
        <div>
          <label className="text-sm text-gray-600 mr-2">Items per page:</label>
          <select
            value={stationsPerPage}
            onChange={(e) => setStationsPerPage(Number(e.target.value))}
            className="border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add New Station</h3>
            <form onSubmit={handleAddStation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={newStation.name}
                  onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newStation.location.latitude}
                    onChange={(e) => setNewStation({
                      ...newStation,
                      location: { ...newStation.location, latitude: parseFloat(e.target.value) }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newStation.location.longitude}
                    onChange={(e) => setNewStation({
                      ...newStation,
                      location: { ...newStation.location, longitude: parseFloat(e.target.value) }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Manager</label>
                <Select
                  options={managerOptions}
                  value={managerOptions.find(opt => opt.value === newStation.manager_id) || null}
                  onChange={option => setNewStation({ ...newStation, manager_id: option ? option.value : '' })}
                  placeholder="Select a manager"
                  isClearable
                  className="mt-1"
                  classNamePrefix="react-select"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Add Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingStation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Edit Station</h3>
            <form onSubmit={handleUpdateStation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editingStation.name}
                  onChange={(e) =>
                    setEditingStation({ ...editingStation, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editingStation.location.latitude}
                    onChange={(e) =>
                      setEditingStation({
                        ...editingStation,
                        location: {
                          ...editingStation.location,
                          latitude: parseFloat(e.target.value)
                        }
                      } as Station)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editingStation.location.longitude}
                    onChange={(e) =>
                      setEditingStation({
                        ...editingStation,
                        location: {
                          ...editingStation.location,
                          longitude: parseFloat(e.target.value)
                        }
                      } as Station)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Manager</label>
                <Select
                  options={managerOptions}
                  value={managerOptions.find(opt => opt.value === editingStation.manager_id) || null}
                  onChange={option =>
                    setEditingStation({ ...editingStation, manager_id: option ? option.value : '' } as Station)
                  }
                  placeholder="Select a manager"
                  isClearable
                  className="mt-1"
                  classNamePrefix="react-select"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingStation(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Update Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationsManagement;
