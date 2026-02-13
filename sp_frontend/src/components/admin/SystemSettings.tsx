import React, { useState, useEffect } from 'react';
import { Database, Download, Trash2, Zap, Activity, HardDrive, FileText } from 'lucide-react';
import { api } from '../../services/api';

interface DatabaseStats {
  table_counts: { [key: string]: number };
  database_info: {
    total_tables: number;
    total_records: number;
    recent_activity: Array<{
      table_name: string;
      count: number;
      latest: string;
    }>;
  };
}

interface BackupFile {
  file_name: string;
  file_path: string;
  file_size: string;
  created_at: string;
  modified_at: string;
}

interface SystemHealth {
  database: string;
  timestamp: string;
  uptime: number;
  disk_space?: {
    available_gb: number;
    backup_directory: string;
  };
}

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'backup' | 'optimize'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for different operations
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  // Loading states
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Load all system data in parallel
      const [statsData, backupsData, healthData] = await Promise.all([
        api.get<DatabaseStats>('/stations/db/stats', token),
        api.get<{ backups: BackupFile[] }>('/stations/db/backups', token),
        api.get<SystemHealth>('/system/health', token)
      ]);

      setDbStats(statsData);
      setBackupFiles(backupsData.backups);
      setSystemHealth(healthData);
    } catch (err: any) {
      setError('Failed to load system data');
      console.error('Error loading system data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      const token = localStorage.getItem('token');

      const result = await api.post('/stations/db/backup', {}, token) as any;
      alert(`Backup created successfully: ${result.backup_file} (${result.file_size})`);

      // Refresh backup files list
      const backupsData = await api.get<{ backups: BackupFile[] }>('/stations/db/backups', token);
      setBackupFiles(backupsData.backups);
    } catch (err: any) {
      setError('Failed to create backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      setDownloadingFile(filename);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/stations/db/backup/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError('Failed to download backup');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm('Are you sure you want to delete this backup file?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await api.delete(`/stations/db/backup/${filename}`, token);

      // Refresh backup files list
      const backupsData = await api.get<{ backups: BackupFile[] }>('/stations/db/backups', token);
      setBackupFiles(backupsData.backups);
    } catch (err: any) {
      setError('Failed to delete backup');
    }
  };

  const handleOptimizeDatabase = async () => {
    try {
      setOptimizing(true);
      const token = localStorage.getItem('token');

      const result = await api.post('/stations/db/optimize', {}, token) as any;
      alert(`Database optimization completed successfully at ${result.optimized_at}`);
    } catch (err: any) {
      setError('Failed to optimize database');
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg">Loading system data...</div>
    </div>
  );

  if (error) return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      {error}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Database className="h-6 w-6 text-gray-600" />
        <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'backup', label: 'Backup & Restore', icon: HardDrive },
            { id: 'optimize', label: 'Optimization', icon: Zap }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        {activeTab === 'overview' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Database Overview</h3>

            {dbStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {Object.entries(dbStats.table_counts).map(([table, count]) => (
                  <div key={table} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500 capitalize">
                          {table.replace('_', ' ')}
                        </p>
                        <p className="text-2xl font-semibold text-gray-900">{count}</p>
                      </div>
                      <Database className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {systemHealth && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">System Health</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Database Status:</span>
                      <span className={`text-sm font-medium ${
                        systemHealth.database === 'connected' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {systemHealth.database}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Uptime:</span>
                      <span className="text-sm text-gray-900">
                        {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
                      </span>
                    </div>
                    {systemHealth.disk_space && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Available Disk Space:</span>
                        <span className="text-sm text-gray-900">{systemHealth.disk_space.available_gb} GB</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Recent Activity (7 days)</h4>
                  {dbStats?.database_info.recent_activity.map((activity, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-500 capitalize">{activity.table_name.replace('_', ' ')}:</span>
                      <span className="text-gray-900">{activity.count} records</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Database Backups</h3>
              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>{creatingBackup ? 'Creating...' : 'Create Backup'}</span>
              </button>
            </div>

            <div className="space-y-4">
              {backupFiles.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No backup files found</p>
              ) : (
                backupFiles.map((backup) => (
                  <div key={backup.file_name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{backup.file_name}</p>
                        <p className="text-sm text-gray-500">
                          {backup.file_size} • Created: {new Date(backup.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownloadBackup(backup.file_name)}
                        disabled={downloadingFile === backup.file_name}
                        className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        <Download className="h-3 w-3" />
                        <span>{downloadingFile === backup.file_name ? 'Downloading...' : 'Download'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.file_name)}
                        className="flex items-center space-x-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'optimize' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Database Optimization</h3>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Activity className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Database Maintenance</h4>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Optimization will perform VACUUM ANALYZE on all tables to reclaim storage space
                      and update table statistics for better query performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleOptimizeDatabase}
                disabled={optimizing}
                className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                <span>{optimizing ? 'Optimizing...' : 'Optimize Database'}</span>
              </button>
            </div>

            {dbStats && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-2">Current Database Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(dbStats.table_counts).map(([table, count]) => (
                    <div key={table} className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-500 capitalize">{table.replace('_', ' ')}</p>
                      <p className="text-lg font-semibold text-gray-900">{count} records</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettings;