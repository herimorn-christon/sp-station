import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Filter, Calendar,Fuel } from 'lucide-react';
import { api } from '../../services/api';
import { Station } from '../../types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SalesData {
  station_name: string;
  total_pms: number;
  total_ago: number;
  total_lpg: number;
  avg_pms: number;
  avg_ago: number;
  avg_lpg: number;
}

interface StationWithSales extends Station {
  salesData?: SalesData;
  complaints?: {
    total: number;
    active: number;
  };
}

const StationMap: React.FC = () => {
  const [stations, setStations] = useState<StationWithSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'complaints' | 'sales'>('all');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [selectedProduct, setSelectedProduct] = useState<'pms' | 'ago' | 'lpg' | 'all'>('all');
  const [complaintsData, setComplaintsData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token') || undefined;
        const [stationsData, salesData, complaintsDataRes] = await Promise.all([
          api.get<Station[]>('/stations', token),
          api.get<SalesData[]>('/sales/analytics', token),
          api.get('/complaints', token),
        ]);

        setComplaintsData(complaintsDataRes as any[]); // <-- Save complaints data to state

        const enrichedStations = stationsData.map((station) => {
          const stationSales = salesData.find((sale) => sale.station_name === station.name);
          const stationComplaints = (complaintsDataRes as any[]).filter((c) => c.station_id === station.id);

          return {
            ...station,
            salesData: stationSales,
            complaints: {
              total: stationComplaints.length,
              active: stationComplaints.filter((c) => c.status !== 'solved').length,
            },
          };
        });

        setStations(enrichedStations);
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getSalesValue = (station: StationWithSales): number => {
    if (!station.salesData) return 0;

    switch (selectedProduct) {
      case 'pms':
        return parseInt(station.salesData.total_pms.toString(), 10) || 0;
      case 'ago':
        return parseInt(station.salesData.total_ago.toString(), 10) || 0;
      default:
        return (
          (parseInt(station.salesData.total_pms.toString(), 10) || 0) +
          (parseInt(station.salesData.total_ago.toString(), 10) || 0)
        );
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MapPin className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-800">Station Map</h2>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="font-semibold mb-2 text-gray-600">Total Stations</h3>
          <p className="text-2xl font-bold text-gray-800">{stations.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="font-semibold mb-2 text-gray-600">Active Complaints</h3>
          <p className="text-2xl font-bold text-red-600">
            {stations.reduce((sum, station) => sum + (station.complaints?.active || 0), 0)}
          </p>
        </div>
      </div>

      {/* Filter controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Stations</option>
              <option value="complaints">Active Complaints</option>
              <option value="sales">Sales Performance</option>
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
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Product:</span>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value as any)}
              className="border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Products</option>
              <option value="pms">PMS</option>
              <option value="ago">AGO</option>
              <option value="lpg">LPG</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map container */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="h-[600px] rounded-lg overflow-hidden">
          <MapContainer
            center={[-1.9403, 29.8739]} // Center on Rwanda (latitude, longitude)
            zoom={8} // Zoom level to focus on Rwanda
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {stations.map((station) => (
              <Marker
                key={station.id}
                position={[station.location.latitude, station.location.longitude]}
              >
                <Popup>
                  <div className="p-3 min-w-[200px]">
                    <h3 className="font-bold text-black text-lg mb-2">SP {station.name}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Complaints:</span>
                        <span className="font-medium text-black">
                          {station.complaints?.total ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Active Complaints:</span>
                        <span className="font-medium text-red-600">
                          {station.complaints?.active ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default StationMap;