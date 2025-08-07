import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { AlertTriangle, CheckCircle, Clock, Upload, LineChart, Settings, ImageIcon, VideoIcon } from 'lucide-react';
import { RootState } from '../../store';
import { Complaint, Station } from '../../types';
import { api } from '../../services/api';

const ManagerDashboard: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [newComplaint, setNewComplaint] = useState<{ 
    title: string; 
    description: string; 
    priority: string; 
    complaint_type: string;
    video_url: string | File; 
    image_url: string | File; 
  }>({ 
    title: '', 
    description: '', 
    priority: 'medium', 
    complaint_type: 'fuel',
    video_url: '', 
    image_url: '' 
  });
  const [managedStation, setManagedStation] = useState<Station | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [imageProgress, setImageProgress] = useState<number>(0);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  
  // Pagination and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // First get the station managed by this user
        const stations = await api.get<Station[]>('/stations', token);
        const userStation = stations.find(station => station.manager_id === user?.id);
        if (userStation) {
          setManagedStation(userStation);
          // Then get complaints for this station
          const complaints = await api.get<Complaint[]>('/complaints', token);
          setComplaints(complaints.filter(c => c.station_id === userStation.id));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load station data');
      }
    };

    fetchData();
  }, [user?.id]);

  // Helper to upload file and track progress
  const uploadFileWithProgress = (file: File, setProgress: (n: number) => void, type: 'image' | 'video') =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadstart = () => setProgress(0);
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      reader.onloadend = () => setProgress(100);
      reader.onload = () => {
        // For preview, just use local URL
        resolve(URL.createObjectURL(file));
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewComplaint(prev => ({ ...prev, image_url: file }));
      setImageProgress(0);
      const previewUrl = await uploadFileWithProgress(file, setImageProgress, 'image');
      setImagePreview(previewUrl);
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewComplaint(prev => ({ ...prev, video_url: file }));
      setVideoProgress(0);
      const previewUrl = await uploadFileWithProgress(file, setVideoProgress, 'video');
      setVideoPreview(previewUrl);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!managedStation) {
      setError('No station assigned to your account');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You are not authenticated. Please log in again.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', newComplaint.title);
      formData.append('description', newComplaint.description);
      formData.append('priority', newComplaint.priority);
      formData.append('complaint_type', newComplaint.complaint_type);
      formData.append('station_id', managedStation.id);

      if (newComplaint.image_url && newComplaint.image_url instanceof File) {
        formData.append('image_url', newComplaint.image_url);
      }
      if (newComplaint.video_url && newComplaint.video_url instanceof File) {
        formData.append('video_url', newComplaint.video_url);
      }

      const data = await api.post<Complaint>(
        '/complaints',
        formData,
        token
      );
      setComplaints([data, ...complaints]);
      setNewComplaint({ 
        title: '', 
        description: '', 
        priority: 'medium', 
        complaint_type: 'fuel',
        video_url: '', 
        image_url: '' 
      });
      setImagePreview(null);
      setVideoPreview(null);
      setImageProgress(0);
      setVideoProgress(0);
    } catch (error) {
      console.error('Error submitting complaint:', error);
      setError('Failed to submit complaint');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'in_progress':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'unicorn_assigned':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'unicorn_received':
        return <AlertTriangle className="h-5 w-5 text-purple-500" />;
      case 'solved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  // Filtered and Paginated Complaints
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

  const handleRemoveImage = () => {
    setNewComplaint(prev => ({ ...prev, image_url: '' }));
    setImagePreview(null);
    setImageProgress(0);
  };

  const handleRemoveVideo = () => {
    setNewComplaint(prev => ({ ...prev, video_url: '' }));
    setVideoPreview(null);
    setVideoProgress(0);
  };

  if (!managedStation) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-800">No Station Assigned</h2>
        <p className="text-gray-600 mt-2">Please contact an administrator to assign you to a station.</p>
      </div>
    );
  }

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

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Managing Station: {managedStation.name}</h2>
        {/* Complaints Status Summary */}
        <div className="flex space-x-6 mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <span className="font-medium text-gray-700">Sent:</span>
            <span className="font-bold">{complaints.filter(c => c.status === 'sent').length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span className="font-medium text-gray-700">In Progress:</span>
            <span className="font-bold">{complaints.filter(c => c.status === 'in_progress' || c.status === 'unicorn_assigned' || c.status === 'unicorn_received').length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-medium text-gray-700">Solved:</span>
            <span className="font-bold">{complaints.filter(c => c.status === 'solved').length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-700">Total:</span>
            <span className="font-bold">{complaints.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Submit New Complaint</h2>
          <form onSubmit={handleSubmitComplaint} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={newComplaint.title}
                onChange={(e) => setNewComplaint({ ...newComplaint, title: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-400 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 px-3 py-2"
                required
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                value={newComplaint.priority}
                onChange={e => setNewComplaint({ ...newComplaint, priority: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-400 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 px-3 py-2"
                required
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Complaint Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Complaint Type</label>
              <select
                value={newComplaint.complaint_type}
                onChange={e => setNewComplaint({ ...newComplaint, complaint_type: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-400 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 px-3 py-2"
                required
              >
                <option value="fuel">Forecourt Complaint</option>
                <option value="lpg">LPG Complaint</option>
              </select>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Image(optional)</label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-400 rounded-lg cursor-pointer hover:bg-blue-50 transition p-4">
                <ImageIcon className="h-8 w-8 text-blue-400 mb-2" />
                <span className="text-xs text-gray-500 mb-1">Click to select an image(optional)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {imageProgress > 0 && imageProgress < 100 && (
                <div className="w-full bg-gray-200 rounded h-2 mt-2">
                  <div
                    className="bg-blue-500 h-2 rounded"
                    style={{ width: `${imageProgress}%` }}
                  />
                </div>
              )}
              {imagePreview && (
                <div className="mt-2 flex items-center space-x-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-32 rounded border object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Video</label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-green-400 rounded-lg cursor-pointer hover:bg-green-50 transition p-4">
                <VideoIcon className="h-8 w-8 text-green-400 mb-2" />
                <span className="text-xs text-gray-500 mb-1">Click to select a video</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
              </label>
              {videoProgress > 0 && videoProgress < 100 && (
                <div className="w-full bg-gray-200 rounded h-2 mt-2">
                  <div
                    className="bg-green-500 h-2 rounded"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
              )}
              {videoPreview && (
                <div className="mt-2 flex items-center space-x-2">
                  <video
                    src={videoPreview}
                    controls
                    className="h-32 rounded border object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newComplaint.description}
                onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-400 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 px-3 py-2"
                rows={4}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
            >
              Submit Complaint
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Recent Complaints</h2>

          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search complaints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200 focus:border-blue-500"
            />
          </div>

          {/* Complaints List */}
          <div className="space-y-4">
            {paginatedComplaints.map((complaint) => (
              <div key={complaint.id} className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{complaint.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        complaint.complaint_type === 'fuel' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {complaint.complaint_type?.toUpperCase() || 'FUEL'}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        Priority: {complaint.priority}
                      </span>
                    </div>
                  </div>
                  {getStatusIcon(complaint.status)}
                </div>
                <p className="text-gray-600 text-sm mt-1">{complaint.description}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {new Date(complaint.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    }).replace(/ /g, '-')}
                  </span>
                  <span className="text-xs font-medium text-gray-700 capitalize">
                    Status: {complaint.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-4">
            <div className="space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div>
              <label className="text-sm text-gray-600 mr-2">Items per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border-gray-300 rounded-md text-sm focus:ring focus:ring-blue-200 focus:border-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;