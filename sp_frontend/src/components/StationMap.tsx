import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useDispatch } from 'react-redux';
import { setStations } from '../store/slices/stationsSlice';
import { Filter, Calendar, Fuel } from 'lucide-react'; // Import the required Lucide icons
import { api } from '../services/api';
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

interface Station {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  manager_id: string;
  created_at: string; // Add this line
}

interface StationWithSales extends Station {
  salesData: SalesData | null;
}

const StationMap: React.FC = () => {
  const dispatch = useDispatch();
  const [stationsWithSales, setStationsWithSales] = useState<StationWithSales[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<'all' | 'pms' | 'ago' | 'lpg'>('all');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('month');

  useEffect(() => {
    const fetchStationsData = async () => {
      try {
        const token = localStorage.getItem('token') || undefined; // Ensures string | undefined
        const [stationsData, salesData] = await Promise.all([
          api.get<Station[]>('/stations', token),
          api.get<SalesData[]>('/sales/analytics', token)
        ]);

        const combinedData: StationWithSales[] = stationsData.map(station => ({
          ...station,
          salesData: salesData.find(sale => sale.station_name === station.name) || null
        }));

        dispatch(setStations(stationsData));
        setStationsWithSales(combinedData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchStationsData();
  }, [dispatch]);

  const getSalesValue = (station: StationWithSales): number => {
    if (!station.salesData) return 0;

    switch (selectedProduct) {
      case 'pms':
        return station.salesData.total_pms || 0;
      case 'ago':
        return station.salesData.total_ago || 0;
      case 'lpg':
        return station.salesData.total_lpg || 0;
      default:
        return (
          (parseInt(station.salesData.total_pms.toString(), 10) || 0) +
          (parseInt(station.salesData.total_ago.toString(), 10) || 0)
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div className="flex space-x-2">
          <Filter className="h-5 w-5 text-red-600" />
          <select
            className="border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value as any)}
          >
            <option value="all">All Products</option>
            <option value="pms">ESSENCE</option>
            <option value="ago">DIESEL</option>
          </select>
        </div>
        <div className="flex space-x-2">
          <Calendar className="h-5 w-5 text-red-600" />
          <select
            className="border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
        </div>
      </div> */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div className="flex space-x-2">
          <Filter className="h-5 w-5 text-red-600" />
          <select
            className="border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value as any)}
          >
            <option value="all">All Products</option>
            <option value="pms">ESSENCE</option>
            <option value="ago">DIESEL</option>
          </select>
        </div>
        <div className="flex space-x-2">
          <Calendar className="h-5 w-5 text-red-600" />
          <select
            className="border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
        </div>
      </div>
      <div className="h-[400px] w-full rounded-lg overflow-hidden shadow-md">
     <MapContainer
  center={[-1.9403, 29.8739]}
  zoom={8}
  style={{ height: '100%', width: '100%' }}
>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; OpenStreetMap contributors'
  />
  {stationsWithSales.map((station) => (
    <Marker
      key={station.id}
      position={[station.location.latitude, station.location.longitude]}
    >
       <Popup>
                <div className="p-3 min-w-[200px]">
                  <h3 className="font-bold text-black text-lg mb-2"> SP {station.name}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Fuel className="h-5 w-5 text-blue-600 mr-2" /> {/* ESSENCE Icon */}
                        <span className="text-gray-600">ESSENCE Sales:</span>
                      </div>
                      <span className="font-medium text-black">
                        Rwf {(station.salesData?.total_pms || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Fuel className="h-5 w-5 text-orange-600 mr-2" /> {/* DIESEL Icon */}
                        <span className="text-gray-600">DIESEL Sales:</span>
                      </div>
                      <span className="font-medium text-black">
                        Rwf {(station.salesData?.total_ago || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-2 mt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Sales:</span>
                        <span className="font-bold text-black">
                          Rwf {getSalesValue(station).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
    </Marker>
  ))}
</MapContainer>

      </div>
    </div>
  );
};

export default StationMap;