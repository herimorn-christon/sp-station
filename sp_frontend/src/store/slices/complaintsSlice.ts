import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Complaint } from '../../types';

interface ComplaintsState {
  complaints: Complaint[];
  loading: boolean;
  error: string | null;
}

const initialState: ComplaintsState = {
  complaints: [],
  loading: false,
  error: null,
};

const complaintsSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    setComplaints: (state, action: PayloadAction<Complaint[]>) => {
      state.complaints = action.payload;
    },
    addComplaint: (state, action: PayloadAction<Complaint>) => {
      state.complaints.unshift(action.payload);
    },
    updateComplaint: (state, action: PayloadAction<Complaint>) => {
      const index = state.complaints.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.complaints[index] = action.payload;
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

export const { setComplaints, addComplaint, updateComplaint, setLoading, setError } = complaintsSlice.actions;
export default complaintsSlice.reducer;