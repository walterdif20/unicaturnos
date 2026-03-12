import { useState } from 'react';
import logo from '../../logo.jpg';

function Header({
  activeSection,
  onChangeSection,
  canAccessAdmin = false,
  user = null,
  profile = null,
  onGoAuth = () => {},
  onLogout = () => {}
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const sections = [
    { id: 'reservas', label: 'Reservas', icon: '📅' },
    { id: 'ganadores', label: 'Ganadores', icon: '🏆' },
    { id: 'mis-reservas', label: 'Mis reservas', icon: '🧾' },
    { id: 'registro', label: 'Mi cuenta', icon: '👤' },
    { id: 'admin', label: 'Admin', icon: '🛠️', requiresAdmin: true }
  ];

  const hasAdminAccess = Boolean(canAccessAdmin);
  const visibleSections = sections.filter((section) => !section.requiresAdmin || hasAdminAccess);

  const handleSectionChange = (sectionId) => {
    onChangeSection(sectionId);
    setIsMenuOpen(false);
  };

  const handleAuthAction = (action) => {
    onGoAuth(action);
    setIsUserMenuOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setIsUserMenuOpen(false);
  };

  const userName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : user?.email || '';
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';

  const getUserAvatar = () => {
    if (user) {
      return <span className="user-avatar-text">{userInitial}</span>;
    } else {
      return (
        <svg className="user-avatar-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
        </svg>
      );
    }
  };

  return (
    <header className="header-fixed">
      <div className="header-content">
        <div className="header-logo-section">
          <img src={logo} alt="Logo La Única" className="header-logo" />
          <div className="header-text">
            <p className="header-title">La Única</p>
            <p className="header-subtitle">Turnos online</p>
          </div>
        </div>
        
        <nav className="header-nav">
          <button
            type="button"
            className={isMenuOpen ? 'header-menu-toggle header-menu-toggle-open' : 'header-menu-toggle'}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-controls="header-nav-items"
          >
            ☰
          </button>
          
          <div 
            id="header-nav-items" 
            className={isMenuOpen ? 'header-nav-items header-nav-items-open' : 'header-nav-items'}
          >
            {visibleSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? 'header-nav-link header-nav-link-active' : 'header-nav-link'}
                onClick={() => handleSectionChange(section.id)}
                aria-current={activeSection === section.id ? 'page' : undefined}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-label">{section.label}</span>
              </button>
            ))}
          </div>

          {/* User Menu Button */}
          <button
            type="button"
            className={`user-menu-toggle ${user ? 'user-menu-toggle-logged' : 'user-menu-toggle-guest'}`}
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            aria-expanded={isUserMenuOpen}
            aria-controls="user-menu-items"
            title={user ? `Sesión: ${userName}` : 'No iniciaste sesión'}
          >
            {getUserAvatar()}
          </button>

          {/* User Menu Dropdown */}
          <div 
            id="user-menu-items" 
            className={isUserMenuOpen ? 'user-menu-items user-menu-items-open' : 'user-menu-items'}
          >
            {user ? (
              <>
                <div className="user-menu-header">
                  <p className="user-menu-name">{userName}</p>
                  <small className="user-menu-email">{user.email}</small>
                </div>
                <button
                  type="button"
                  className="user-menu-link"
                  onClick={() => handleAuthAction('profile')}
                >
                  👤 Mi perfil
                </button>
                <hr className="user-menu-divider" />
                <button
                  type="button"
                  className="user-menu-link user-menu-logout"
                  onClick={handleLogout}
                >
                  🚪 Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="user-menu-link"
                  onClick={() => handleAuthAction('login')}
                >
                  🔑 Login
                </button>
                <button
                  type="button"
                  className="user-menu-link"
                  onClick={() => handleAuthAction('register')}
                >
                  ✍️ Registrarme
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header;
