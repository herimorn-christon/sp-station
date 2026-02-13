import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/slices/authSlice';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';
import logo from '../assets/logo_png.png';
import toast, { Toaster } from 'react-hot-toast';

type LoginResponse = {
  token: string;
  user: any;
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await api.post<LoginResponse>('/users/login', { email, password });
      localStorage.setItem('token', response.token);
      dispatch(setUser(response.user));
      navigate('/');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'An error occurred. Please check your credentials.'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 to-secondary-100 py-6 px-3 sm:py-12 sm:px-4 lg:px-8">
      <Toaster position="top-center" />
      <div className="max-w-md w-full bg-white shadow-form-lg rounded-form p-6 sm:p-8 lg:p-10 mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="mb-6 sm:mb-8">
            <img src={logo} alt="Logo" className="mx-auto h-32 sm:h-36 lg:h-40 w-auto" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-secondary-800 mb-2">
            SP Station Management
          </h2>
          <p className="text-sm sm:text-base text-secondary-600">Sign in to your account</p>
        </div>
        <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-secondary-700 mb-1 sm:mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-secondary-300 placeholder-secondary-400 text-secondary-900 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                placeholder="Enter your email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-secondary-700 mb-1 sm:mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 text-sm sm:text-base border border-secondary-300 placeholder-secondary-400 text-secondary-900 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
            </div>
          </div>
          <div className="pt-3 sm:pt-4">
            <button
              type="submit"
              className="group relative w-full flex justify-center items-center py-2.5 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-semibold rounded-form text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-form touch-manipulation"
            >
              <LogIn className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
