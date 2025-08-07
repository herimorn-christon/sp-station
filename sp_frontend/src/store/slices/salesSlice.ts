import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SalesData } from '../../types';

interface SalesState {
  salesData: SalesData[];
  analytics: any; // Type this based on your analytics data structure
  loading: boolean;
  error: string | null;
}

const initialState: SalesState = {
  salesData: [],
  analytics: null,
  loading: false,
  error: null,
};

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    setSalesData: (state, action: PayloadAction<SalesData[]>) => {
      state.salesData = action.payload;
    },
    addSalesData: (state, action: PayloadAction<SalesData>) => {
      state.salesData.unshift(action.payload);
    },
    setAnalytics: (state, action: PayloadAction<any>) => {
      state.analytics = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setSalesData, addSalesData, setAnalytics, setLoading, setError } = salesSlice.actions;
export default salesSlice.reducer;