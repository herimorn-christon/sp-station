import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { api } from '../services/api';
import { setUser, setError } from '../store/slices/authSlice';

// Define the expected user type
type User = {
  id: string;
  email: string;
  role: string;
  name?: string;
  created_at?: string; // <-- Add this line
};

const AuthCheck: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get<User>('/users/me', token);
          if (response.id && response.email && response.role) {
            dispatch(setUser({
              id: response.id,
              email: response.email,
              role: response.role,
              name: response.name || '',
              created_at: response.created_at // <-- Add this line
            }));
          } else {
            throw new Error('Invalid user data received');
          }
        } catch (error) {
          console.error('Session validation failed:', error);
          dispatch(setUser(null));
          localStorage.removeItem('token');
          dispatch(setError('Session expired or invalid'));
        }
      }
    };

    validateSession();
  }, [dispatch]);

  return null;
};

export default AuthCheck;