import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Filter, Calendar, TrendingUp } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell 
} from 'recharts';
import { api } from '../../services/api';

interface SalesData {
  station_name: string;
  total_pms: number;
  total_ago: number;
  total_lpg: number;
  avg_pms: number;
  avg_ago: number;
  avg_lpg: number;
  date?: string;
}

// Add color constants
const COLORS = ['#DC2626', '#991B1B', '#7F1D1D'];

const OperationsReports: React.FC = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [productFilter, setProductFilter] = useState<'all' | 'pms' | 'ago' | 'lpg'>('all');

  // Pagination and search state for Detailed Sales Data
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default to 10 items per page
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token') || undefined;
        const data = await api.get<SalesData[]>('/sales/analytics', token);
        setSalesData(data);
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and paginate Detailed Sales Data
  const filteredSalesData = salesData.filter((station) =>
    station.station_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSalesData = filteredSalesData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSalesData.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleExportData = () => {
    // TODO: Implement export functionality
    alert('Export functionality coming soon!');
  };

  // Update the formatCurrency function to handle large numbers better
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `Rwf ${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `Rwf ${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `Rwf ${(value / 1000).toFixed(2)}K`;
    }
    return `Rwf ${value.toFixed(2)}`;
  };

  // Replace the getPieChartData with getProductData
  const getProductData = () => {
    const totalPMS = salesData.reduce((sum, station) => sum + station.total_pms, 0);
    const totalAGO = salesData.reduce((sum, station) => sum + station.total_ago, 0);
    const totalLPG = salesData.reduce((sum, station) => sum + station.total_lpg, 0);
    
    if (totalPMS === 0 && totalAGO === 0 && totalLPG === 0) {
      return [];
    }
    
    return [
      { name: 'PMS', value: totalPMS, fill: COLORS[0] },
      { name: 'AGO', value: totalAGO, fill: COLORS[1] },
      { name: 'LPG', value: totalLPG, fill: COLORS[2] }
    ];
  };

  const getTrendData = () => {
    return salesData.map(station => ({
      name: station.station_name,
      total: station.total_pms + station.total_ago + station.total_lpg,
      avg: (station.avg_pms + station.avg_ago + station.avg_lpg) / 3
    }));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-800">Operations Reports</h2>
        </div>
        <button
          onClick={handleExportData}
          className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          <Download className="h-5 w-5" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Update the sales cards to use a more contained format */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { 
            title: 'Total ESSENCE Sales', 
            total: salesData.reduce((sum, station) => sum + parseInt(station.total_pms.toString(), 10), 0), 
            avg: salesData.reduce((sum, station) => sum + parseInt(station.avg_pms.toString(), 10), 0) / salesData.length 
          },
          { 
            title: 'Total DIESEL Sales', 
            total: salesData.reduce((sum, station) => sum + parseInt(station.total_ago.toString(), 10), 0), 
            avg: salesData.reduce((sum, station) => sum + parseInt(station.avg_ago.toString(), 10), 0) / salesData.length 
          },
        ].map((item, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold mb-2 text-gray-800">{item.title}</h3>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(item.total)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Average: {formatCurrency(item.avg)}
            </p>
          </div>
        ))}
      </div>

      {/* Replace the pie chart section with this horizontal bar chart */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center space-x-2 mb-6">
          <TrendingUp className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold">Product Distribution</h3>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer>
            <BarChart
              data={getProductData()}
              layout="vertical"
              margin={{ top: 20, right: 40, bottom: 20, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" 
                tickFormatter={(value) => formatCurrency(value)}
              />
              <YAxis type="category" dataKey="name" />
              <Tooltip 
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: 'none'
                }}
              />
              <Legend />
              <Bar 
                dataKey="value" 
                name="Total Sales"
                radius={[0, 4, 4, 0]}
              >
                {getProductData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {getProductData().length === 0 && (
          <div className="text-center text-gray-500 mt-4">
            No sales data available
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Sales Trend Analysis</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={getTrendData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="total" 
                stackId="1" 
                stroke="#DC2626" 
                fill="#DC2626" 
                fillOpacity={0.3} 
                name="Total Sales"
              />
              <Area 
                type="monotone" 
                dataKey="avg" 
                stackId="2" 
                stroke="#991B1B" 
                fill="#991B1B" 
                fillOpacity={0.3} 
                name="Average Sales"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold">Sales Performance</h3>
          </div>
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value as any)}
                className="border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">All Products</option>
                <option value="pms">ESSENCE</option>
                <option value="ago">DIESEL</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
              >
                <option value="day">Last 24 Hours</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>
          </div>
        </div>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="station_name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_pms" name="PMS Sales" fill="#DC2626" />
              <Bar dataKey="total_ago" name="AGO Sales" fill="#991B1B" />
              <Bar dataKey="total_lpg" name="LPG Sales" fill="#7F1D1D" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Average Daily Sales by Station</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="station_name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avg_pms" name="Avg PMS" stroke="#DC2626" />
              <Line type="monotone" dataKey="avg_ago" name="Avg AGO" stroke="#991B1B" />
              <Line type="monotone" dataKey="avg_lpg" name="Avg LPG" stroke="#7F1D1D" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Detailed Sales Data</h3>

        {/* Search Bar for Detailed Sales Data */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by station name..."
            className="w-full border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500 p-2"
          />
        </div>

        {/* Detailed Sales Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Station
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total ESSENCE Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total DIESEL Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Daily Sales
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentSalesData.map((station) => (
                <tr key={station.station_name}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{station.station_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(station.total_pms)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(station.total_ago)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency((station.avg_pms + station.avg_ago) / 2)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination for Detailed Sales Data */}
        <div className="flex justify-between items-center mt-4">
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
          <div>
            <label className="text-sm text-gray-600 mr-2">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsReports;