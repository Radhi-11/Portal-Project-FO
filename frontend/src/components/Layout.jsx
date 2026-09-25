import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/projectUtils';
import './Layout.css';
import lintasartaLogo from '../assets/logo_lintasarta.png';

const SIDEBAR_SECTIONS = [
  {
    title: null,
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: '📊' },
      { name: 'Projects', path: '/my-projects', icon: '📋' },
      { name: 'Upload Project', path: '/upload-project', icon: '⬆️' },
      { name: 'Geomap', path: '/geomap', icon: '🗺️' },
      { name: 'Reports', path: '/reports', icon: '📈' },
    ],
  },
        {
          title: 'GOVERNANCE',
          items: [
            { name: 'KHS Master', path: '/khs-master', icon: '💰' },
            { name: 'Audit Logs', path: '/audit-logs', icon: '📜' },
            { name: 'Users', path: '/users', icon: '👥' },
            { name: 'Profile', path: '/profile', icon: '👤' },
          ],
        },
];

export default function Layout() {
  const { user, logout, isAdmin, unreadCount, notifications, markNotificationsRead, loadNotifications } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = () => {
    setNotificationDropdownOpen((prev) => !prev);
    if (!notificationDropdownOpen && unreadCount > 0) {
      markNotificationsRead();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getCurrentPageName = () => {
    const allItems = SIDEBAR_SECTIONS.flatMap((s) => s.items);
    return allItems.find((item) => item.path === location.pathname)?.name || 'Dashboard';
  };

  const currentPage = getCurrentPageName();

  const adminMenu = SIDEBAR_SECTIONS.flat();
  const userMenuItems = SIDEBAR_SECTIONS[0].items.filter(
    (item) => !['Users'].includes(item.name),
  );

  const menuItems = isAdmin
    ? SIDEBAR_SECTIONS
    : [
        {
          title: null,
          items: userMenuItems,
        },
      ];

  return (
    <div className="layout">
      <div className={`sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)} />

      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
          <img src={lintasartaLogo} alt="Lintasarta Logo" className="sidebar-logo-portal" />
          <span className="sidebar-title">Portal Project FO</span>
        </div>
        <button
          className={`sidebar-toggle ${sidebarCollapsed ? 'collapsed' : 'expanded'}`}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className="toggle-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="toggle-line"
              d="M4 6L20 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              className="toggle-line"
              d="M4 12L20 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              className="toggle-line"
              d="M4 18L20 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <nav className="sidebar-nav">
          {menuItems.map((section) => (
            <div key={section.title || 'main'} className="sidebar-section">
              {section.title && <div className="sidebar-section-title">{section.title}</div>}
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  data-title={item.name}
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.name}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className={`main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="header">
          <div className="header-left">
            <div className="breadcrumb">
              <span className="breadcrumb-active">{currentPage}</span>
            </div>
          </div>
          <div className="header-right">
            <div className="notification-container" ref={notificationRef}>
              <button
                className="notification-btn"
                aria-label="Notifications"
                onClick={handleNotificationClick}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              {notificationDropdownOpen && (
                <div className="notification-dropdown">
                  <div className="notification-dropdown-header">
                    <h3>Notifications</h3>
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">No notifications</div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}
                        >
                          <div className="notification-item-title">{notif.title}</div>
                          <div className="notification-item-message">{notif.message}</div>
                          <div className="notification-item-time">{formatDate(notif.created_at)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="user-profile" onClick={handleLogout}>
              <div className="user-avatar">
                {user?.full_name?.[0] || user?.username?.[0] || 'U'}
              </div>
              <div className="user-info">
                <div className="user-name">{user?.full_name || user?.username}</div>
                <div className="user-role">{user?.role}</div>
              </div>
              <svg className="user-dropdown" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
