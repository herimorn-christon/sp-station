import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Wrench, 
  FileText, 
  Shield, 
  Eye,
  Users,
  Calendar
} from 'lucide-react';
import { RootState } from '../../store';
import { Complaint, WorkPermit } from '../../types';
import { api } from '../../services/api';

const UnicornDashboard: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workPermits, setWorkPermits] = useState<WorkPermit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPermitDetails, setShowPermitDetails] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<WorkPermit | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);

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
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const [complaintsData, workPermitsData] = await Promise.all([
          api.get<Complaint[]>('/complaints', token),
          api.get<WorkPermit[]>('/work-permits', token)
        ]);
        
        // Filter complaints assigned to this unicorn
        const myComplaints = complaintsData.filter(c => 
          c.unicorn_id === user?.id || 
          (c.status === 'unicorn_assigned' || c.status === 'unicorn_received')
        );
        
        setComplaints(myComplaints);
        setWorkPermits(workPermitsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleReceiveComplaint = async (complaintId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await api.put(`/complaints/${complaintId}/receive`, {}, token);
      
      // Refresh complaints
      const data = await api.get<Complaint[]>('/complaints', token);
      const myComplaints = data.filter(c => 
        c.unicorn_id === user?.id || 
        (c.status === 'unicorn_assigned' || c.status === 'unicorn_received')
      );
      setComplaints(myComplaints);
    } catch (error) {
      console.error('Error receiving complaint:', error);
      setError('Failed to receive complaint');
    }
  };

  const handleCompleteRepair = async (complaintId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Check if work permit is approved
      const complaintPermits = workPermits.filter(wp => wp.complaint_id === complaintId);
      const hasApprovedPermit = complaintPermits.some(wp => wp.status === 'approved');
      
      if (complaintPermits.length > 0 && !hasApprovedPermit) {
        setError('Work permit must be approved before completing repair');
        return;
      }

      await api.put(`/complaints/${complaintId}/status`, { 
        status: 'solved',
        completion_notes: 'Repair completed by unicorn technician'
      }, token);
      
      // Refresh complaints
      const data = await api.get<Complaint[]>('/complaints', token);
      const myComplaints = data.filter(c => 
        c.unicorn_id === user?.id || 
        (c.status === 'unicorn_assigned' || c.status === 'unicorn_received')
      );
      setComplaints(myComplaints);
    } catch (error) {
      console.error('Error completing repair:', error);
      setError('Failed to complete repair');
    }
  };

  const getComplaintWorkPermit = (complaintId: string) => {
    return workPermits.find(wp => wp.complaint_id === complaintId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unicorn_assigned':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'unicorn_received':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'solved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  const getPermitStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  const assignedComplaints = complaints.filter(c => c.status === 'unicorn_assigned');
  const receivedComplaints = complaints.filter(c => c.status === 'unicorn_received');
  const completedComplaints = complaints.filter(c => c.status === 'solved');
  const pendingPermits = workPermits.filter(wp => wp.status === 'pending');

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
        <Shield className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Unicorn Technician Dashboard</h2>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New Assignments</p>
              <p className="text-2xl font-bold text-yellow-600">{assignedComplaints.length}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-orange-600">{receivedComplaints.length}</p>
            </div>
            <Wrench className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedComplaints.length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Permits</p>
              <p className="text-2xl font-bold text-blue-600">{pendingPermits.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Complaints List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">My Assigned Complaints</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Permit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {complaints.map((complaint) => {
                const workPermit = getComplaintWorkPermit(complaint.id);
                return (
                <tr key={complaint.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{complaint.title}</div>
                    <div className="text-sm text-gray-500">{complaint.description}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{complaint.station_name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {getStatusIcon(complaint.status)}
                      <span className="ml-2 text-sm text-gray-900 capitalize">
                        {complaint.status.replace('_', ' ')}
                      </span>
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
                            setSelectedPermit(workPermit);
                            setShowPermitDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No permit</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(complaint.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium space-x-2">
                    {complaint.status === 'unicorn_assigned' && (
                      <button
                        onClick={() => handleReceiveComplaint(complaint.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                      >
                        Receive Assignment
                      </button>
                    )}
                    {complaint.status === 'unicorn_received' && (
                      <span className="text-green-600 text-xs font-medium">
                        Work in Progress
                      </span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Work Permit Details Modal */}
      {showPermitDetails && selectedPermit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Work Permit Details</h3>
                <button
                  onClick={() => setShowPermitDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm ${getPermitStatusColor(selectedPermit.status)}`}>
                    {selectedPermit.status}
                  </span>
                </div>
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
                {selectedPermit.rejection_reason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
                    <p className="text-red-700">{selectedPermit.rejection_reason}</p>
                  </div>
                )}
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Work permits are created by the Station Manager. 
                    You can only proceed with work after the permit is approved by Operations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnicornDashboard;