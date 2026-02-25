const sections = [
  { id: 'reservas', label: 'Reservas', hint: 'Elegí día, cancha y horario', icon: '📅' },
  { id: 'ganadores', label: 'Ganadores', hint: 'Revisá sorteos recientes', icon: '🏆' },
  { id: 'mis-reservas', label: 'Mis reservas', hint: 'Gestioná tus turnos', icon: '🧾' },
  { id: 'registro', label: 'Mi cuenta', hint: 'Login, registro y perfil', icon: '👤' },
  { id: 'admin', label: 'Administración', hint: 'Panel interno', icon: '🛠️', requiresAdmin: true }
];

function MainNav({ activeSection, onChangeSection, canAccessAdmin = false }) {
  const hasAdminAccess = Boolean(canAccessAdmin);
  const visibleSections = sections.filter((section) => !section.requiresAdmin || hasAdminAccess);

  return (
    <nav className="main-nav" aria-label="Secciones principales">
      {visibleSections.map((section) => (
        <button
          key={section.id}
          type="button"
          className={activeSection === section.id ? 'nav-pill nav-pill-active' : 'nav-pill'}
          onClick={() => onChangeSection(section.id)}
          aria-current={activeSection === section.id ? 'page' : undefined}
          title={section.hint}
        >
          <span className="nav-pill-label">{section.icon} {section.label}</span>
          <small className="nav-pill-hint">{section.hint}</small>
        </button>
      ))}
    </nav>
  );
}

export default MainNav;
