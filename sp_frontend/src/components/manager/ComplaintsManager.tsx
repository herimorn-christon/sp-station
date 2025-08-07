import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Wrench,
  Plus,
  FileText,
  Eye,
  Flame
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { api } from '../../services/api';
import { Complaint, Station, WorkPermit } from '../../types';
import { RootState } from '../../store';
import WorkPermitInterface from '../WorkPermitInterface';

const ComplaintsManager: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workPermits, setWorkPermits] = useState<WorkPermit[]>([]);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const [showWorkPermitModal, setShowWorkPermitModal] = useState(false);
  const [selectedComplaintForPermit, setSelectedComplaintForPermit] = useState<Complaint | null>(null);
  const [showPermitDetails, setShowPermitDetails] = useState(false);
  const [selectedPermitForView, setSelectedPermitForView] = useState<WorkPermit | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const parseJsonSafely = (jsonString: string | null): string[] => {
    if (!jsonString) return [];
    try {
      // Handle case where it's already an array
      if (Array.isArray(jsonString)) return jsonString;
      // Handle case where it's a JSON string
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('JSON parse error:', error);
      // If it's a simple string, split by comma or return as single item
      if (typeof jsonString === 'string') {
        return jsonString.includes(',') ? jsonString.split(',').map(s => s.trim()) : [jsonString];
      }
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const token = localStorage.getItem('token') ?? undefined;
        const [complaintsData, stationsData, workPermitsData] = await Promise.all([
          api.get<Complaint[]>('/complaints', token),
          api.get<Station[]>('/stations', token),
          api.get<WorkPermit[]>('/work-permits', token),
        ]);

        const userStation = stationsData.find((s) => s.manager_id === user.id);
        if (userStation) {
          setStation(userStation);
          setComplaints(
            complaintsData.filter((c) => c.station_id === userStation.id)
          );
          setWorkPermits(workPermitsData);
        }
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleCreateWorkPermit = async (permitData: any) => {
    try {
      const token = localStorage.getItem('token') ?? undefined;
      // Add station_id to the payload
      await api.post('/work-permits', { ...permitData, station_id: selectedComplaintForPermit.station_id }, token);

      // Refresh work permits
      const workPermitsData = await api.get<WorkPermit[]>('/work-permits', token);
      setWorkPermits(workPermitsData);
      setShowWorkPermitModal(false);
      setSelectedComplaintForPermit(null);
    } catch (err) {
      setError('Failed to create work permit');
    }
  };

  const handleUpdateComplaint = async () => {
    if (!selectedComplaint) return;

    try {
      const token = localStorage.getItem('token') ?? undefined;
      

      const updatedComplaint = await api.put<Complaint>(
        `/complaints/${selectedComplaint.id}/status`,
        { 
          status: 'solved'
        },
        token
      );

      setComplaints((prev) =>
        prev.map((complaint) =>
          complaint.id === updatedComplaint.id ? updatedComplaint : complaint
        )
      );
      setShowConfirmModal(false);
      setSelectedComplaint(null);
    } catch (err) {
      setError('Failed to update complaint');
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

  const getComplaintWorkPermit = (complaintId: string) => {
    return workPermits.find(wp => wp.complaint_id === complaintId);
  };

  const getPermitStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const canResolveComplaint = (complaint: Complaint) => {
    const workPermit = getComplaintWorkPermit(complaint.id);
    // If a work permit exists and is pending, cannot resolve
    if (workPermit && workPermit.status === 'pending') return false;
    // Otherwise, allow if status is in_progress, unicorn_received, or trident_received
    return complaint.status === 'in_progress' || 
           complaint.status === 'unicorn_received' || 
           complaint.status === 'trident_received';
  };

  const getAssignedTechnicianName = (complaint: Complaint) => {
    if (complaint.repair_type === 'unicorn') {
      return complaint.unicorn_name || 'Unicorn Technician';
    } else if (complaint.repair_type === 'trident') {
      return complaint.trident_name || 'Trident Technician';
    }
    return 'In-house Team';
  };

  const filteredComplaints = complaints.filter((complaint) =>
    complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    complaint.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!station) return <div>No station assigned</div>;

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

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-800">Complaints Management</h2>
        </div>
        <div className="relative w-1/3">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search complaints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring focus:ring-red-200 focus:border-red-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Permit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedComplaints.map((complaint) => {
              const workPermit = getComplaintWorkPermit(complaint.id);
              return (
              <tr key={complaint.id}>
                <td className="px-6 py-4">{complaint.title}</td>
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
                <td className="px-6 py-4">{complaint.description}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {getStatusIcon(complaint.status)}
                    <span className="ml-2 capitalize">
                      {complaint.status === 'unicorn_assigned' ? 'Assigned to Unicorn' :
                       complaint.status === 'unicorn_received' ? 'Unicorn Working' :
                       complaint.status === 'trident_assigned' ? 'Assigned to Trident' :
                       complaint.status === 'trident_received' ? 'Trident Working' :
                       complaint.status.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-1">
                    {complaint.complaint_type === 'lpg' && 
                     (complaint.status === 'trident_assigned' || complaint.status === 'trident_received') && (
                      <Flame className="h-4 w-4 text-orange-500" />
                    )}
                    <span>{getAssignedTechnicianName(complaint)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {workPermit ? (
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPermitStatusColor(workPermit.status)}`}>
                        {workPermit.status}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedPermitForView(workPermit);
                          setShowPermitDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-xs">No permit</span>
                      {complaint.requires_work_permit && 
                       (complaint.status === 'unicorn_assigned' || complaint.status === 'trident_assigned') && (
                        <button
                          onClick={() => {
                            setSelectedComplaintForPermit(complaint);
                            setShowWorkPermitModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-800"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const date = new Date(complaint.created_at);
                    const day = date.toLocaleString('en-GB', { day: '2-digit' });
                    const month = date.toLocaleString('en-GB', { month: 'long' });
                    const year = date.getFullYear();
                    return `${day}-${month}-${year}`;
                  })()}
                </td>
                <td className="px-6 py-4 capitalize">{complaint.priority || 'Normal'}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-row items-center space-x-2">
                    {canResolveComplaint(complaint) && (
                      <button
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setShowConfirmModal(true);
                        }}
                        className="text-sm text-white bg-green-600 px-3 py-1 rounded-md hover:bg-green-700"
                      >
                        Mark as Solved
                      </button>
                    )}
                    {complaint.requires_work_permit && !workPermit && 
                      (complaint.status === 'unicorn_assigned' || complaint.status === 'trident_assigned') && (
                        <button
                          onClick={() => {
                            setSelectedComplaintForPermit(complaint);
                            setShowWorkPermitModal(true);
                          }}
                          className="text-sm text-white bg-orange-600 px-3 py-1 rounded-md hover:bg-orange-700 flex items-center"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Create Permit
                        </button>
                    )}
                    {/* Station Manager can create work permit for any complaint that needs it */}
                    {(complaint.status === 'in_progress' || 
                      complaint.status === 'unicorn_assigned' || 
                      complaint.status === 'unicorn_received' ||
                      complaint.status === 'trident_assigned' || 
                      complaint.status === 'trident_received') && !workPermit && (
                      <button
                        onClick={() => {
                          setSelectedComplaintForPermit(complaint);
                          setShowWorkPermitModal(true);
                        }}
                        className="text-sm text-white bg-orange-600 px-3 py-1 rounded-md hover:bg-orange-700 flex items-center"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Create Permit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            <ChevronLeft className="inline mr-1" /> Previous
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="ml-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Next <ChevronRight className="inline ml-1" />
          </button>
        </div>
        <div>
          <label className="text-sm text-gray-600 mr-2">Items per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="border-gray-300 rounded-md text-sm focus:ring focus:ring-red-200 focus:border-red-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      {showConfirmModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Confirm Resolution</h3>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to mark this complaint as solved?
              </p>
              <div className="mt-2 p-3 bg-gray-50 rounded">
                <p className="font-medium">{selectedComplaint.title}</p>
                <p className="text-sm text-gray-600">{selectedComplaint.description}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateComplaint}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Mark as Solved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Work Permit Creation Modal */}
      {showWorkPermitModal && selectedComplaintForPermit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Create Work Permit</h3>
                <button
                  onClick={() => {
                    setShowWorkPermitModal(false);
                    setSelectedComplaintForPermit(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800">Complaint Details:</h4>
                <p className="text-sm text-blue-700">{selectedComplaintForPermit.title}</p>
                <p className="text-xs text-blue-600">{selectedComplaintForPermit.description}</p>
                {selectedComplaintForPermit.complaint_type === 'lpg' && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Flame className="h-3 w-3 text-orange-500" />
                    <span className="text-xs text-orange-600 font-medium">LPG System - Extra Safety Required</span>
                  </div>
                )}
              </div>
              <WorkPermitInterface 
                complaintId={selectedComplaintForPermit.id}
                stationId={selectedComplaintForPermit.station_id} // <-- add this
                onSubmit={handleCreateWorkPermit}
              />
            </div>
          </div>
        </div>
      )}

      {/* Work Permit Details Modal */}
      {showPermitDetails && selectedPermitForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Work Permit Details</h3>
                <button
                  onClick={() => {
                    setShowPermitDetails(false);
                    setSelectedPermitForView(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Permit Number</label>
                  <p className="text-gray-900 font-mono">{selectedPermitForView.permit_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm ${getPermitStatusColor(selectedPermitForView.status)}`}>
                    {selectedPermitForView.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Permit Type</label>
                  <p className="text-gray-900">{selectedPermitForView.permit_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Required Safety PPE</label>
                  <div className="flex flex-wrap gap-2">
                    {parseJsonSafely(selectedPermitForView.required_safety_ppe).map((item: string) => (
                      <span key={item} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {item.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Required Precautions</label>
                  <div className="flex flex-wrap gap-2">
                    {parseJsonSafely(selectedPermitForView.required_precautions).map((item: string) => (
                      <span key={item} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                        {item.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                {selectedPermitForView.work_details && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Work Details</label>
                    <p className="text-gray-900">{selectedPermitForView.work_details}</p>
                  </div>
                )}
                {selectedPermitForView.custom_requirements && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Custom Requirements</label>
                    <p className="text-gray-900">{selectedPermitForView.custom_requirements}</p>
                  </div>
                )}
                {selectedPermitForView.rejection_reason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
                    <p className="text-red-700">{selectedPermitForView.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsManager;