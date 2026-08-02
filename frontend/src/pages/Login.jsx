import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import samsFitzterLogo from '../assets/sams_fitzter_logo.jpg';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Invalid username or password');
    }
  };

  const handleQuickLogin = (userType) => {
    if (userType === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else if (userType === 'receptionist') {
      setUsername('receptionist');
      setPassword('recep123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-600/5 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src={samsFitzterLogo} 
            alt="Sam's Fitzter Logo" 
            className="w-24 h-24 object-cover rounded-3xl border-2 border-amber-500/20 shadow-2xl mb-4" 
          />
          <h2 className="text-3xl font-extrabold text-white tracking-tight text-center">Sam's Fitzter</h2>
          <p className="text-sm text-amber-500/80 font-bold uppercase tracking-wider mt-1 text-center">Lifestyle & Fitness Studio</p>
        </div>

        {/* Login form card */}
        <div className="glass-panel rounded-3xl shadow-2xl border border-slate-800/80 p-8">
          <h3 className="text-xl font-bold text-white mb-6">Sign In</h3>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-200">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-slate-300 mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                  <User size={18} />
                </span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 rounded-xl glass-input text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 font-bold text-white rounded-xl gradient-btn cursor-pointer shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 mt-2 text-sm"
            >
              {loading ? 'Verifying Account...' : 'Log In'}
            </button>
          </form>

          {/* Quick-login Demo panel */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-amber-500 uppercase tracking-wider">
              <Shield size={14} />
              <span>Demo Accounts (Quick-login)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickLogin('admin')}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-300 transition text-left cursor-pointer flex flex-col justify-between"
              >
                <span className="text-slate-400 block font-normal">Log in as</span>
                <strong className="text-slate-200 mt-1 font-semibold">Admin Manager</strong>
              </button>
              <button
                onClick={() => handleQuickLogin('receptionist')}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-300 transition text-left cursor-pointer flex flex-col justify-between"
              >
                <span className="text-slate-400 block font-normal">Log in as</span>
                <strong className="text-slate-200 mt-1 font-semibold">Receptionist</strong>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
