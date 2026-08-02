import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Cpu, RefreshCw, Menu, Bell } from 'lucide-react';
import apiClient from '../api/client.js';
import { useSidebar } from '../context/SidebarContext';

export const Header = ({ title = 'Dashboard' }) => {
  const { toggle } = useSidebar();
  const navigate = useNavigate();
  const [deviceStatus, setDeviceStatus] = useState('Checking...');
  const [syncing, setSyncing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    fetchDeviceStatus();
    fetchNotificationCount();
    const intervalId = setInterval(fetchNotificationCount, 2 * 60 * 1000); // 2 minutes refresh
    return () => clearInterval(intervalId);
  }, []);

  const fetchNotificationCount = async () => {
    try {
      const res = await apiClient.get('/api/dashboard/notifications');
      if (res.success && res.data) {
        const data = res.data;
        const count = 
          (data.birthdaysToday?.length || 0) +
          (data.birthdaysUpcoming?.length || 0) +
          (data.expiresTomorrow?.length || 0) +
          (data.expires3Days?.length || 0) +
          (data.expires7Days?.length || 0) +
          (data.expired?.length || 0) +
          (data.paymentDue?.length || 0) +
          (data.longLeaveMembers?.length || 0);
        setNotificationCount(count);
      }
    } catch (err) {
      console.error('Error fetching notification count in Header:', err);
    }
  };

  const fetchDeviceStatus = async () => {
    try {
      const res = await apiClient.get('/api/device/health');
      if (res.success && res.data) {
        if (res.data.deviceReachable) {
          setDeviceStatus('Online');
        } else if (res.data.configured) {
          setDeviceStatus('Gateway Standby');
        } else {
          setDeviceStatus('Gateway Unconfigured');
        }
      } else {
        setDeviceStatus('Gateway Offline');
      }
    } catch (err) {
      setDeviceStatus('Gateway Disconnected');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.post('/api/device/sync', { device_id: 1 });
      if (res.success) {
        await fetchDeviceStatus();
        alert('Biometric gateway synced successfully!');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };


  const formatToday = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  return (
    <header className="min-h-[5rem] py-3 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 px-4 md:px-8 sticky top-0 z-20">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {/* Toggle Hamburger menu button on mobile */}
        <button 
          onClick={toggle}
          className="lg:hidden p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl cursor-pointer"
          title="Open Menu"
        >
          <Menu size={18} />
        </button>
        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight truncate max-w-[150px] sm:max-w-none">{title}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:gap-6">
        {/* Current Date */}
        <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400 bg-slate-900/40 border border-slate-800/80 px-3.5 py-1.5 rounded-xl">
          <Calendar size={15} className="text-indigo-400" />
          <span>{formatToday()}</span>
        </div>

        {/* Notification Bell Button */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-slate-400 hover:text-white bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 rounded-xl cursor-pointer transition-colors"
          title="System Alerts"
        >
          <Bell size={16} />
          {notificationCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-red-500 text-[9px] font-black text-white rounded-full flex items-center justify-center border border-slate-950 animate-bounce shadow-md font-mono">
              {notificationCount}
            </span>
          )}
        </button>

        {/* Biometric Sync Gateway */}
        <div className="flex items-center gap-2 md:gap-3 bg-slate-900/40 border border-slate-800/80 px-2.5 md:px-4 py-1.5 rounded-xl text-[10px] md:text-xs font-medium text-slate-300">
          <div className="flex items-center gap-1.5">
            <Cpu size={13} className="text-emerald-400 animate-pulse" />
            <span className="text-slate-500 hidden md:inline">Biometrics:</span>
            <span className="text-emerald-400 font-semibold truncate max-w-[80px] sm:max-w-none">{deviceStatus}</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800"></div>
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-indigo-400 disabled:opacity-50"
            title="Sync Biometric Terminal Logs"
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>
    </header>
  );
};
export default Header;
