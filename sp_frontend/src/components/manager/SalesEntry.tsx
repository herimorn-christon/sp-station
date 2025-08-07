import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, Upload, Calendar, TrendingUp } from 'lucide-react';
import { useSelector } from 'react-redux';
import { api } from '../../services/api';
import { Station } from '../../types';
import { RootState } from '../../store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface SalesData {
  date: string;
  pms_sales: number;
  ago_sales: number;
  lpg_sales: number;
}

const SalesEntry: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesData>({
    date: new Date().toISOString().split('T')[0],
    pms_sales: 0,
    ago_sales: 0,
    lpg_sales: 0
  });
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const token = localStorage.getItem('token');
        const [stationsData, salesData] = await Promise.all([
          api.get<Station[]>('/stations', token),
          api.get('/sales', token)
        ]);
        
        const userStation = stationsData.find(s => s.manager_id === user.id);
        if (userStation) {
          setStation(userStation);
          const stationSales = (salesData as any[])
            .filter(sale => sale.station_id === userStation.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setHistoricalData(stationSales);
        }
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;

    try {
      const token = localStorage.getItem('token');
      const data = await api.post('/sales', {
        ...salesData,
        station_id: station.id
      }, token);

      setHistoricalData([data, ...historicalData]);
      setSalesData({
        date: new Date().toISOString().split('T')[0],
        pms_sales: 0,
        ago_sales: 0,
        lpg_sales: 0
      });

      alert('Sales data submitted successfully');
    } catch (err) {
      setError('Failed to submit sales data');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // TODO: Process and validate Excel data
        alert('Excel import functionality coming soon!');
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      setError('Failed to process Excel file');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!station) return <div>No station assigned</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-800">Sales Entry</h2>
        </div>
        <div className="flex space-x-4">
          <input
            type="file"
            id="excel-upload"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="excel-upload"
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 cursor-pointer"
          >
            <Upload className="h-5 w-5" />
            <span>Upload Excel</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Enter Daily Sales</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={salesData.date}
                  onChange={(e) => setSalesData({ ...salesData, date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ESSENCE Sales (Rwf)</label>
                <input
                  type="number"
                  value={salesData.pms_sales}
                  onChange={(e) => setSalesData({ ...salesData, pms_sales: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">DIESEL Sales (Rwf)</label>
                <input
                  type="number"
                  value={salesData.ago_sales}
                  onChange={(e) => setSalesData({ ...salesData, ago_sales: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                {/* <label className="block text-sm font-medium text-gray-700">LPG Sales (Rwf)</label>
                <input
                  type="number"
                  value={salesData.lpg_sales}
                  onChange={(e) => setSalesData({ ...salesData, lpg_sales: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring focus:ring-red-200"
                  required
                  min="0"
                  step="0.01"
                /> */}
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Submit Sales Data</span>
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold">Today's Summary</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-red-700">ESSENCE Sales</h4>
              <p className="text-2xl font-bold text-red-600">
                Rwf{salesData.pms_sales.toLocaleString()}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-red-700">DIESEL Sales</h4>
              <p className="text-2xl font-bold text-red-600">
                Rwf{salesData.ago_sales.toLocaleString()}
              </p>
            </div>
            {/* <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-red-700">LPG Sales</h4>
              <p className="text-2xl font-bold text-red-600">
                Rwf{salesData.lpg_sales.toLocaleString()}
              </p>
            </div> */}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Sales Trend</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="pms_sales" name="ESSENCE" stroke="#DC2626" />
              <Line type="monotone" dataKey="ago_sales" name="DIESEL" stroke="#991B1B" />
              {/* <Line type="monotone" dataKey="lpg_sales" name="LPG" stroke="#7F1D1D" /> */}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Recent Sales History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ESSENCE Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DIESEL Sales
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LPG Sales
                </th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {historicalData.slice(0, 7).map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(sale.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sale.pms_sales.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sale.ago_sales.toLocaleString()}</div>
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sale.lpg_sales.toLocaleString()}</div>
                  </td> */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      Rwf {(
                        parseInt(sale.pms_sales.toString(), 10) +
                        parseInt(sale.ago_sales.toString(), 10)
                      ).toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesEntry;