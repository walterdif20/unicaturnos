import { useState } from 'react';

const sections = [
  { id: 'reservas', label: 'Reservas', hint: 'Elegí día, cancha y horario', icon: '📅' },
  { id: 'ganadores', label: 'Ganadores', hint: 'Revisá sorteos recientes', icon: '🏆' },
  { id: 'mis-reservas', label: 'Mis reservas', hint: 'Gestioná tus turnos', icon: '🧾' },
  { id: 'registro', label: 'Mi cuenta', hint: 'Login, registro y perfil', icon: '👤' },
  { id: 'admin', label: 'Administración', hint: 'Panel interno', icon: '🛠️', requiresAdmin: true }
];

function MainNav({ activeSection, onChangeSection, canAccessAdmin = false }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hasAdminAccess = Boolean(canAccessAdmin);
  const visibleSections = sections.filter((section) => !section.requiresAdmin || hasAdminAccess);

  const handleSectionChange = (sectionId) => {
    onChangeSection(sectionId);
    setIsMenuOpen(false);
  };

  return (
    <nav className="main-nav" aria-label="Secciones principales">
      <button
        type="button"
        className={isMenuOpen ? 'menu-toggle menu-toggle-open' : 'menu-toggle'}
        onClick={() => setIsMenuOpen((prev) => !prev)}
        aria-expanded={isMenuOpen}
        aria-controls="main-nav-items"
      >
        ☰ Menú
      </button>
      <div id="main-nav-items" className={isMenuOpen ? 'main-nav-items main-nav-items-open' : 'main-nav-items'}>
        {visibleSections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? 'nav-pill nav-pill-active' : 'nav-pill'}
            onClick={() => handleSectionChange(section.id)}
            aria-current={activeSection === section.id ? 'page' : undefined}
            title={section.hint}
          >
            <span className="nav-pill-label">{section.icon} {section.label}</span>
            <small className="nav-pill-hint">{section.hint}</small>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default MainNav;
