import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './slices/authSlice';
import complaintsReducer from './slices/complaintsSlice';
import stationsReducer from './slices/stationsSlice';
import salesReducer from './slices/salesSlice';

// Custom logger middleware
const logger = (store: any) => (next: any) => (action: any) => {
  console.group(action.type);
  console.info('Dispatching:', action);
  console.log('Previous State:', store.getState());
  const result = next(action);
  console.log('Next State:', store.getState());
  console.groupEnd();
  return result;
};

// Add persist logging
const persistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user'],
  debug: true, // Enable persist debug logs
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    complaints: complaintsReducer,
    stations: stationsReducer,
    sales: salesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(logger),
});

// Add rehydration listener
persistStore(store, null, () => {
  console.log('Rehydration completed');
  console.log('Current store state:', store.getState());
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Log initial state
console.log('Initial store setup completed');
console.log('Initial state:', store.getState());