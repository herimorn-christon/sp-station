import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, AlertTriangle, CheckCircle, Wrench, Users, FileText, Eye, Plus, Flame } from 'lucide-react';
import { api } from '../../services/api';
import { Complaint, User, WorkPermit } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const ComplaintsOperations: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [unicornUsers, setUnicornUsers] = useState<User[]>([]);
  const [tridentUsers, setTridentUsers] = useState<User[]>([]);
  const [workPermits, setWorkPermits] = useState<WorkPermit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<{ [key: string]: string }>({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [requiresWorkPermit, setRequiresWorkPermit] = useState(false);
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<WorkPermit | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const token = localStorage.getItem('token') || undefined;
        const [data, users, permits] = await Promise.all([
          api.get<Complaint[]>('/complaints', token),
          api.get<User[]>('/users', token),
          api.get<WorkPermit[]>('/work-permits', token)
        ]);
        
        setComplaints(data);
        setUnicornUsers(users.filter(u => u.role === 'unicorn'));
        setTridentUsers(users.filter(u => u.role === 'trident'));
        setWorkPermits(permits);

        console.log('Data fetched successfully:', { 
          complaints: data.length, 
          permits: permits.length, 
          unicorns: users.filter(u => u.role === 'unicorn').length,
          tridents: users.filter(u => u.role === 'trident').length
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  const assignToTechnician = async () => {
    if (!selectedComplaint || !selectedTechnician) return;

    try {
      const token = localStorage.getItem('token') || undefined;
      
      // Determine assignment type based on complaint type and selected technician
      const technicianUser = [...unicornUsers, ...tridentUsers].find(u => u.id === selectedTechnician);
      const isAssigningToUnicorn = technicianUser?.role === 'unicorn';
      const isAssigningToTrident = technicianUser?.role === 'trident';
      
      // Validate assignment logic
      if (selectedComplaint.complaint_type === 'fuel' && !isAssigningToUnicorn) {
        setError('Forecourt complaints must be assigned to Unicorn technicians');
        return;
      }
      
      if (selectedComplaint.complaint_type === 'lpg' && !isAssigningToTrident) {
        setError('LPG complaints must be assigned to Trident technicians');
        return;
      }

      const endpoint = isAssigningToUnicorn ? 'assign-unicorn' : 'assign-trident';
      const technicianIdField = isAssigningToUnicorn ? 'unicorn_id' : 'trident_id';
      
      const updatedComplaint = await api.put<Complaint>(
        `/complaints/${selectedComplaint.id}/${endpoint}`,
        { 
          [technicianIdField]: selectedTechnician,
          requires_work_permit: requiresWorkPermit
        },
        token
      );
      
      setComplaints(prev => prev.map(c => c.id === updatedComplaint.id ? updatedComplaint : c));
      setShowAssignModal(false);
      setSelectedComplaint(null);
      setSelectedTechnician('');
      setRequiresWorkPermit(false);
    } catch (err) {
      setError('Failed to assign complaint to technician');
    }
  };

  const markInHouse = async (complaintId: string) => {
    try {
      const token = localStorage.getItem('token') || undefined;
      const updatedComplaint = await api.put<Complaint>(
        `/complaints/${complaintId}/mark-inhouse`,
        {},
        token
      );
      
      setComplaints(prev => prev.map(c => c.id === updatedComplaint.id ? updatedComplaint : c));
    } catch (err) {
      setError('Failed to mark as in-house repair');
    }
  };

  const approveWorkPermit = async (permitId: string, status: 'approved' | 'rejected') => {
    try {
      const token = localStorage.getItem('token') || undefined;
      await api.put(`/work-permits/${permitId}/status`, { 
        status,
        rejection_reason: status === 'rejected' ? rejectionReason : undefined
      }, token);
      
      // Refresh work permits
      const permits = await api.get<WorkPermit[]>('/work-permits', token);
      setWorkPermits(permits);
      setShowPermitModal(false);
      setRejectionReason('');
    } catch (err) {
      setError('Failed to update work permit status');
    }
  };

  const getComplaintWorkPermit = (complaintId: string) => {
    return workPermits.find(wp => wp.complaint_id === complaintId);
  };

  const parseJsonSafely = (jsonString: string | null): string[] => {
    if (!jsonString) return [];
    try {
      // Handle case where it's already an array
      if (Array.isArray(jsonString)) return jsonString;
      // Handle case where it's a JSON string
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('JSON parse error:', error, 'Input:', jsonString);
      // If it's a simple string, split by comma or return as single item
      if (typeof jsonString === 'string') {
        return jsonString.includes(',') ? jsonString.split(',').map(s => s.trim()) : [jsonString];
      }
      return [];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'in_progress':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'unicorn_assigned':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'unicorn_received':
        return <Wrench className="h-5 w-5 text-purple-500" />;
      case 'trident_assigned':
        return <Users className="h-5 w-5 text-orange-500" />;
      case 'trident_received':
        return <Wrench className="h-5 w-5 text-red-500" />;
      case 'solved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getAvailableTechnicians = (complaintType: string) => {
    if (complaintType === 'fuel') {
      return unicornUsers;
    } else if (complaintType === 'lpg') {
      return tridentUsers;
    }
    return [...unicornUsers, ...tridentUsers];
  };

  const getAssignedTechnicianName = (complaint: Complaint) => {
    if (complaint.repair_type === 'unicorn') {
      return complaint.unicorn_name || 'Unicorn Technician';
    } else if (complaint.repair_type === 'trident') {
      return complaint.trident_name || 'Trident Technician';
    }
    return 'In-house';
  };

  const filteredComplaints = complaints;

  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
          <button 
            onClick={() => setError(null)}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <AlertCircle className="h-6 w-6 text-gray-600" />
        <h2 className="text-2xl font-bold text-gray-800">Operations - Complaints Management</h2>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">
          Complaints List ({filteredComplaints.length} total)
        </h3>
        
        {/* Pending Work Permits Section */}
        {workPermits.filter(wp => wp.status === 'pending').length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">Pending Work Permit Approvals</h4>
            <div className="space-y-2">
              {workPermits.filter(wp => wp.status === 'pending').map(permit => (
                <div key={permit.id} className="flex items-center justify-between bg-white p-2 rounded">
                  <span className="text-sm">{permit.complaint_title} - {permit.permit_type}</span>
                  <div className="space-x-2">
                    <button
                      onClick={() => {
                        setSelectedPermit(permit);
                        setShowPermitModal(true);
                      }}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Station
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Permit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                {user?.role === 'operations' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedComplaints.map((complaint) => {
                const workPermit = getComplaintWorkPermit(complaint.id);
                return (
                <tr key={complaint.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{complaint.title}</div>
                  </td>
                      <td className="px-6 py-4">
                     <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${
                        complaint.complaint_type === 'fuel'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {complaint.complaint_type === 'lpg' && <Flame className="h-3 w-3" />}
                        <span>
                          {complaint.complaint_type === 'fuel'
                            ? 'Forecourt'
                            : complaint.complaint_type === 'lpg'
                              ? 'LPG'
                              : 'Other'}
                        </span>
                      </span>
                    </div>
                  
                 </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 truncate max-w-xs">{complaint.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{complaint.station_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(complaint.status)}
                      <span className="ml-2 text-sm text-gray-900 capitalize">
                        {complaint.status === 'unicorn_assigned' ? 'Assigned to Unicorn' :
                         complaint.status === 'unicorn_received' ? 'Unicorn Working' :
                         complaint.status === 'trident_assigned' ? 'Assigned to Trident' :
                         complaint.status === 'trident_received' ? 'Trident Working' :
                         complaint.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center space-x-1">
                      {complaint.complaint_type === 'lpg' && 
                       (complaint.status === 'trident_assigned' || complaint.status === 'trident_received') && (
                        <Flame className="h-4 w-4 text-orange-500" />
                      )}
                      <span>{getAssignedTechnicianName(complaint)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {workPermit ? (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        workPermit.status === 'approved' ? 'bg-green-100 text-green-800' :
                        workPermit.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {workPermit.status}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">No permit</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(complaint.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{complaint.priority || 'medium'}</div>
                  </td>
                  {user?.role === 'operations' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {complaint.status === 'sent' && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => {
                                setSelectedComplaint(complaint);
                                setShowAssignModal(true);
                              }}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center space-x-1"
                            >
                              {complaint.complaint_type === 'lpg' && <Flame className="h-3 w-3" />}
                              <span>
                                Assign {complaint.complaint_type === 'fuel' ? 'Unicorn' : 
                                       complaint.complaint_type === 'lpg' ? 'Trident' : 'Technician'}
                              </span>
                            </button>
                            <button
                              onClick={() => markInHouse(complaint.id)}
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              In-house
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <div>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      </div>

      {/* Assign to Technician Modal */}
      {showAssignModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              {selectedComplaint.complaint_type === 'lpg' && <Flame className="h-5 w-5 text-orange-500" />}
              <span>
                Assign to {selectedComplaint.complaint_type === 'fuel' ? 'Unicorn' : 
                          selectedComplaint.complaint_type === 'lpg' ? 'Trident' : 'Technician'}
              </span>
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-800">{selectedComplaint.title}</p>
                <p className="text-xs text-gray-600">{selectedComplaint.description}</p>
                <div className="flex items-center space-x-1 mt-1">
                  {selectedComplaint.complaint_type === 'lpg' && <Flame className="h-3 w-3 text-orange-500" />}
                  <span className="text-xs font-medium">
                    {selectedComplaint.complaint_type === 'fuel' ? 'Forecourt Complaint' : 
                     selectedComplaint.complaint_type === 'lpg' ? 'LPG System Complaint' : 'Other'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select {selectedComplaint.complaint_type === 'fuel' ? 'Unicorn' : 
                          selectedComplaint.complaint_type === 'lpg' ? 'Trident' : ''} Technician
                </label>
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select a technician...</option>
                  {getAvailableTechnicians(selectedComplaint.complaint_type).map(technician => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name} ({technician.role === 'unicorn' ? 'Unicorn' : 'Trident'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={requiresWorkPermit}
                    onChange={(e) => setRequiresWorkPermit(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="text-sm text-gray-700">Requires work permit</span>
                </label>
              </div>
              {selectedComplaint.complaint_type === 'lpg' && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Flame className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">LPG Safety Notice</span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">
                    LPG system work requires specialized safety protocols and equipment.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={assignToTechnician}
                disabled={!selectedTechnician}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Work Permit Review Modal */}
      {showPermitModal && selectedPermit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Work Permit Review</h3>
                <button
                  onClick={() => setShowPermitModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Permit Type</label>
                  <p className="text-gray-900">{selectedPermit.permit_type}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Required Safety PPE</label>
                  <div className="flex flex-wrap gap-2">
                    {parseJsonSafely(selectedPermit.required_safety_ppe).map((item: string) => (
                      <span key={item} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {item.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Required Precautions</label>
                  <div className="flex flex-wrap gap-2">
                    {parseJsonSafely(selectedPermit.required_precautions).map((item: string) => (
                      <span key={item} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                        {item.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                
                {selectedPermit.work_details && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Work Details</label>
                    <p className="text-gray-900">{selectedPermit.work_details}</p>
                  </div>
                )}
                
                {selectedPermit.custom_requirements && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Custom Requirements</label>
                    <p className="text-gray-900">{selectedPermit.custom_requirements}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter reason for rejection..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => approveWorkPermit(selectedPermit.id, 'rejected')}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reject
                </button>
                <button
                  onClick={() => approveWorkPermit(selectedPermit.id, 'approved')}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsOperations;