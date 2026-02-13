import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Edit2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { User } from '../../types';

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Add User
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'station_manager'
  });

  // Edit User
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10); // Default to 10

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token') ?? undefined;
        const data = await api.get<User[]>('/users', token);
        const filteredUsers = data.filter(user => user.role !== 'admin');
        setUsers(filteredUsers);
      } catch {
        toast.error('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token') ?? undefined;
      const data = await api.post<User>('/users/register', newUser, token);
      setUsers(prev => [...prev, data]);
      setShowAddModal(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'station_manager'
      });
      toast.success('User added successfully');
    } catch {
      toast.error('Failed to add user');
    }
  };

  const openEditModal = (user: User) => {
    setEditUser({ ...user });
    setShowEditModal(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    try {
      const token = localStorage.getItem('token') ?? undefined;
      const { id, name, email, role } = editUser;
      const updated = await api.put<User>(`/users/${id}`, { name, email, role }, token);
      setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
      setShowEditModal(false);
      setEditUser(null);
      toast.success('User updated successfully');
    } catch (error) {
      toast.error('Failed to update user');
    }
  };


  // Filter users based on search query
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.role === 'unicorn' && 'unicorn'.includes(searchQuery.toLowerCase())) ||
    (user.role === 'trident' && 'trident'.includes(searchQuery.toLowerCase())) ||
    (user.role === 'station_manager' && 'manager'.includes(searchQuery.toLowerCase())) ||
    (user.role === 'operations' && 'operations'.includes(searchQuery.toLowerCase()))
  );

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="w-full space-y-4 sm:space-y-6 px-4 sm:px-0">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-100 p-2 rounded-form">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-secondary-800">Users Management</h2>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 bg-primary-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-form hover:bg-primary-700 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-form font-medium text-sm sm:text-base touch-manipulation self-start sm:self-auto">
          <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or role"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base border border-secondary-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
          />
        </div>
        <div className="flex items-center space-x-3">
          <label className="text-xs sm:text-sm font-medium text-secondary-700">Items per page:</label>
          <select
            value={usersPerPage}
            onChange={e => {
              setUsersPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 sm:px-4 py-2 border border-secondary-300 rounded-form text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow-form rounded-form border border-secondary-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="bg-secondary-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Name</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Email</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Role</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Created At</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {currentUsers.map(user => (
                <tr key={user.id} className="hover:bg-secondary-50">
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <div className="text-xs sm:text-sm text-secondary-900 break-words max-w-[100px] sm:max-w-none">{user.name}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <div className="text-xs sm:text-sm text-secondary-900 break-words max-w-[120px] sm:max-w-none">{user.email}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'station_manager' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'operations' ? 'bg-green-100 text-green-800' :
                      user.role === 'unicorn' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'trident' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role === 'station_manager' ? 'Station Manager' :
                       user.role === 'operations' ? 'Operations' :
                       user.role === 'unicorn' ? 'Unicorn Tech' :
                       user.role === 'trident' ? 'Trident Tech' :
                       user.role}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-secondary-500">
                    {(() => {
                      const date = new Date(user.created_at);
                      const day = date.getDate();
                      const month = date.toLocaleString('en-GB', { month: 'short' });
                      const year = date.getFullYear();
                      return `${day}-${month}-${year}`;
                    })()}
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 text-right text-xs sm:text-sm font-medium">
                    <button onClick={() => openEditModal(user)} className="text-indigo-600 hover:text-indigo-900 touch-manipulation">
                      <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="text-xs sm:text-sm text-secondary-500 order-2 sm:order-1">
          Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
        </div>
        <div className="flex space-x-3 order-1 sm:order-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-form hover:bg-primary-700 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-form font-medium text-sm sm:text-base touch-manipulation"
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-form hover:bg-primary-700 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-form font-medium text-sm sm:text-base touch-manipulation"
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-form w-full max-w-md shadow-form-lg border border-secondary-200 mx-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-secondary-800">Add New User</h3>
            <form onSubmit={handleAddUser} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-secondary-700 mb-1 sm:mb-2">Name</label>
                <input type="text" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-secondary-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200" placeholder="Enter full name" required />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-secondary-700 mb-1 sm:mb-2">Email</label>
                <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-secondary-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200" placeholder="Enter email address" required />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-secondary-700 mb-1 sm:mb-2">Password</label>
                <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-secondary-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200" placeholder="Enter password" required />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-secondary-700 mb-1 sm:mb-2">Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value as User['role'] })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-secondary-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                >
                  <option value="station_manager">Station Manager</option>
                  <option value="operations">Operations</option>
                  <option value="unicorn">Unicorn Technician</option>
                  <option value="trident">Trident Technician</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-secondary-300 rounded-form text-secondary-700 hover:bg-secondary-50 font-medium transition-colors duration-200 text-sm sm:text-base touch-manipulation">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-form hover:bg-primary-700 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-form font-medium text-sm sm:text-base touch-manipulation">Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-form w-full max-w-md shadow-form-lg border border-secondary-200 mx-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-secondary-800">Edit User</h3>
            <form onSubmit={handleEditUser} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-secondary-700 mb-1 sm:mb-2">Name</label>
                <input type="text" value={editUser.name || ''} onChange={e => setEditUser(prev => prev ? { ...prev, name: e.target.value } : null)} className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-secondary-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200" required />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-secondary-700 mb-1 sm:mb-2">Email</label>
                <input type="email" value={editUser.email || ''} onChange={e => setEditUser(prev => prev ? { ...prev, email: e.target.value } : null)} className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-secondary-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200" required />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-secondary-700 mb-1 sm:mb-2">Role</label>
                <select
                  value={editUser.role || ''}
                  onChange={e => setEditUser(prev => prev ? { ...prev, role: e.target.value as User['role'] } : null)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-secondary-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                >
                  <option value="station_manager">Station Manager</option>
                  <option value="operations">Operations</option>
                  <option value="unicorn">Unicorn Technician</option>
                  <option value="trident">Trident Technician</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
                <button type="button" onClick={() => { setShowEditModal(false); setEditUser(null); }} className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-secondary-300 rounded-form text-secondary-700 hover:bg-secondary-50 font-medium transition-colors duration-200 text-sm sm:text-base touch-manipulation">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-form hover:bg-primary-700 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-form font-medium text-sm sm:text-base touch-manipulation">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
