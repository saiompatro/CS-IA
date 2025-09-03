import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../firebase';

const Sidebar = () => {
  const location = useLocation();
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'employee');
  const [expanded, setExpanded] = useState(true);

  // Check if the current route matches the link
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className={`h-screen bg-gray-800 text-white transition-all duration-300 ${expanded ? 'w-64' : 'w-20'} fixed left-0 top-0`}>
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h1 className={`font-bold ${expanded ? 'block' : 'hidden'}`}>Company X</h1>
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="p-1 rounded-md hover:bg-gray-700"
        >
          {expanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      <nav className="mt-6">
        <ul className="space-y-2 px-2">
          {/* Client Dashboard - for all users */}
          <li>
            <Link 
              to="/dashboard" 
              className={`flex items-center p-3 rounded-lg transition-colors ${
                isActive('/dashboard') 
                  ? 'bg-blue-600' 
                  : 'hover:bg-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className={`ml-3 ${expanded ? 'block' : 'hidden'}`}>Client Dashboard</span>
            </Link>
          </li>

          {/* Admin Panel - Admin only */}
          {userRole === 'admin' && (
            <li>
              <Link 
                to="/admin" 
                className={`flex items-center p-3 rounded-lg transition-colors ${
                  isActive('/admin') 
                    ? 'bg-blue-600' 
                    : 'hover:bg-gray-700'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className={`ml-3 ${expanded ? 'block' : 'hidden'}`}>Admin Panel</span>
              </Link>
            </li>
          )}

          {/* Chat - for all users */}
          <li>
            <Link 
              to="/chat" 
              className={`flex items-center p-3 rounded-lg transition-colors ${
                isActive('/chat') 
                  ? 'bg-blue-600' 
                  : 'hover:bg-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className={`ml-3 ${expanded ? 'block' : 'hidden'}`}>Chat</span>
            </Link>
          </li>

          {/* Calendar - for all users */}
          <li>
            <Link 
              to="/calendar" 
              className={`flex items-center p-3 rounded-lg transition-colors ${
                isActive('/calendar') 
                  ? 'bg-blue-600' 
                  : 'hover:bg-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 2 0 002 2z" />
              </svg>
              <span className={`ml-3 ${expanded ? 'block' : 'hidden'}`}>Calendar</span>
            </Link>
          </li>

          {/* Projects - for all users */}
          <li>
            <Link 
              to="/projects" 
              className={`flex items-center p-3 rounded-lg transition-colors ${
                isActive('/projects') 
                  ? 'bg-blue-600' 
                  : 'hover:bg-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className={`ml-3 ${expanded ? 'block' : 'hidden'}`}>Projects</span>
            </Link>
          </li>

          {/* Finances - for all users */}
          <li>
            <Link 
              to="/finances" 
              className={`flex items-center p-3 rounded-lg transition-colors ${
                isActive('/finances') 
                  ? 'bg-blue-600' 
                  : 'hover:bg-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className={`ml-3 ${expanded ? 'block' : 'hidden'}`}>Finances</span>
            </Link>
          </li>

          {/* Profile - for all users */}
          <li>
            <Link 
              to="/profile" 
              className={`flex items-center p-3 rounded-lg transition-colors ${
                isActive('/profile') 
                  ? 'bg-blue-600' 
                  : 'hover:bg-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className={`ml-3 ${expanded ? 'block' : 'hidden'}`}>Profile</span>
            </Link>
          </li>
        </ul>
      </nav>

      <div className={`absolute bottom-0 w-full p-4 border-t border-gray-700  ${expanded ? 'block' : 'hidden'}`}>
        <div className="flex items-center">
          <div className="rounded-full h-8 w-8 bg-gray-600 flex items-center justify-center">
            {auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{auth.currentUser?.email || 'User'}</p>
            <p className="text-xs text-gray-400 capitalize">{userRole}</p>
          </div>
        </div>
        <Link 
          to="/login" 
          onClick={() => {
            auth.signOut();
            localStorage.removeItem('userRole');
          }}
          className="mt-4 block w-full text-center py-2 text-sm bg-red-600 hover:bg-red-700 rounded-md transition-colors"
        >
          Logout
        </Link>
      </div>
    </div>
  );
};

export default Sidebar; 