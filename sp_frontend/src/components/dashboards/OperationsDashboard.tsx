import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock, Wrench, Bell, BarChart } from 'lucide-react';
import { Complaint } from '../../types';
import { api } from '../../services/api';

const OperationsDashboard: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    api.get<Complaint[]>('/complaints', token)
      .then((data) => setComplaints(data))
      .catch((error) => console.error('Error fetching complaints:', error));
  }, []);

  const updateComplaintStatus = async (id: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const updatedComplaint = await api.put<Complaint>(`/complaints/${id}/status`, { status }, token);
      setComplaints((prev) =>
        prev.map((complaint) => (complaint.id === id ? updatedComplaint : complaint))
      );
    } catch (error) {
      console.error('Error updating complaint status:', error);
    }
  };

  const handleSendNotification = (complaintId: string) => {
    const confirmSend = window.confirm(
      'Are you sure you want to send a notification to the station manager?'
    );
    if (confirmSend) {
      updateComplaintStatus(complaintId, 'in_progress');
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-4">
            <Bell className="h-8 w-8 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold">New Complaints</h3>
              <p className="text-gray-600">
                {complaints.filter((c) => c.status === 'sent').length} pending
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-4">
            <Wrench className="h-8 w-8 text-orange-500" />
            <div>
              <h3 className="text-lg font-semibold">In Progress</h3>
              <p className="text-gray-600">
                {complaints.filter((c) => c.status === 'in_progress').length} repairs
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-4">
            <BarChart className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold">Completed</h3>
              <p className="text-gray-600">
                {complaints.filter((c) => c.status === 'solved').length} resolved
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Active Complaints</h2>
          <div className="space-y-4">
            {complaints
              .filter((c) => c.status !== 'solved')
              .map((complaint) => (
                <div
                  key={complaint.id}
                  className="border p-4 rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedComplaint(complaint)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{complaint.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        complaint.complaint_type === 'fuel'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {complaint.complaint_type === 'fuel'
                          ? 'Forecourt'
                          : complaint.complaint_type === 'lpg'
                            ? 'LPG'
                            : 'Other'}
                      </span>
                    </div>
                    {complaint.status === 'sent' ? (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{complaint.description}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-gray-500">
                      Station: {complaint.station_name}
                    </span>
                    <div className="space-x-2">
                      {complaint.status === 'sent' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendNotification(complaint.id);
                          }}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-blue-600"
                        >
                          Send Notification
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Complaint Details */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Complaint Details</h2>
          {selectedComplaint ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{selectedComplaint.title}</h3>
                <span
                  className="px-3 py-1 rounded-full text-sm capitalize"
                  style={{
                    backgroundColor:
                      selectedComplaint.status === 'solved'
                        ? '#dcfce7'
                        : selectedComplaint.status === 'in_progress'
                        ? '#fff7ed'
                        : '#fef9c3',
                    color:
                      selectedComplaint.status === 'solved'
                        ? '#166534'
                        : selectedComplaint.status === 'in_progress'
                        ? '#9a3412'
                        : '#854d0e',
                  }}
                >
                  {selectedComplaint.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-gray-700">{selectedComplaint.description}</p>
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-2">Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Complaint Received</p>
                      <p className="text-xs text-gray-500">
                        {(() => {
                          const date = new Date(selectedComplaint.created_at);
                          const day = date.getDate();
                          const month = date.toLocaleString('en-GB', { month: 'short' });
                          const year = date.getFullYear();
                          return `${day}-${month}-${year}`;
                        })()}
                      </p>
                    </div>
                  </div>
                  {selectedComplaint.status !== 'sent' && (
                    <div className="flex items-center space-x-3">
                      <Wrench className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium">Repair Started</p>
                        <p className="text-xs text-gray-500">
                          {(() => {
                            const date = new Date(selectedComplaint.updated_at);
                            const day = date.getDate();
                            const month = date.toLocaleString('en-GB', { month: 'short' });
                            const year = date.getFullYear();
                            return `${day}-${month}-${year}`;
                          })()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Select a complaint to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OperationsDashboard;