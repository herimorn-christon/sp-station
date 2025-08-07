import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Station } from '../../types';

interface StationsState {
  stations: Station[];
  loading: boolean;
  error: string | null;
}

const initialState: StationsState = {
  stations: [],
  loading: false,
  error: null,
};

const stationsSlice = createSlice({
  name: 'stations',
  initialState,
  reducers: {
    setStations: (state, action: PayloadAction<Station[]>) => {
      state.stations = action.payload;
    },
    addStation: (state, action: PayloadAction<Station>) => {
      state.stations.push(action.payload);
    },
    updateStation: (state, action: PayloadAction<Station>) => {
      const index = state.stations.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.stations[index] = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setStations, addStation, updateStation, setLoading, setError } = stationsSlice.actions;
export default stationsSlice.reducer;