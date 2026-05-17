import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSemester, setActiveSemester] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      api.get('/lookup/active-semester')
        .then(({ data }) => setActiveSemester(data.semester || ''))
        .catch(() => {});
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = () => {
    if (!user) return [];
    if (user.role === 'student') return [
      { path: '/student', label: 'Dashboard', icon: '📊' },
      { path: '/student/profile', label: 'Profile', icon: '👤' },
    ];
    if (user.role === 'instructor') return [
      { path: '/faculty', label: 'Dashboard', icon: '📊' },
      { path: '/faculty/profile', label: 'Profile', icon: '👤' },
    ];
    if (user.role === 'admin') return [
      { path: '/admin', label: 'Dashboard', icon: '⚙️' },
    ];
    return [];
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-40 bg-primary text-gray-900 p-2 rounded-lg shadow-lg hover:bg-primary-light transition-all font-bold"
      >
        ☰
      </button>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 shadow-2xl transform transition-transform duration-300 z-50 flex flex-col overflow-y-auto ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ background: 'linear-gradient(180deg, #1F2937 0%, #111827 50%, #0B0F19 100%)' }}>
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg text-xl font-bold text-gray-900 animate-pulse-glow">
              U
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-main">UniTrack</h1>
              <p className="text-xs text-text-muted">Academic Portal</p>
            </div>
          </div>
          {activeSemester && (
            <div className="bg-primary/10 backdrop-blur rounded-lg px-3 py-2 border border-primary/30">
              <p className="text-xs font-semibold text-primary-light">📅 Active Semester</p>
              <p className="text-sm font-bold text-primary">{activeSemester}</p>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navLinks().map((link) => (
            <button
              key={link.path}
              onClick={() => {
                navigate(link.path);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                location.pathname === link.path
                  ? 'bg-primary text-gray-900 shadow-lg scale-105'
                  : 'text-text-main hover:bg-gray-700/60'
              }`}
            >
              <span className="text-xl">{link.icon}</span>
              <span className="text-sm">{link.label}</span>
            </button>
          ))}
        </nav>

        {/* User Info + Logout */}
        {user && (
          <div className="border-t border-gray-700 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary border border-primary/40">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="text-sm">
                <p className="font-semibold text-text-main">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-text-muted capitalize">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center justify-center gap-2 bg-gray-700/60 hover:bg-danger/20 text-text-main hover:text-danger font-semibold py-2 px-4 rounded-lg transition-all border border-gray-600"
              id="logout-btn"
            >
              🚪 Logout
            </button>
          </div>
        )}
      </aside>

      {/* Overlay for all screens */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
