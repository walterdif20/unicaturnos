const sections = [
  { id: 'reservas', label: 'Reservas' },
  { id: 'mis-reservas', label: 'Mis reservas' },
  { id: 'registro', label: 'Mi cuenta' },
  { id: 'admin', label: 'Administración', requiresAdmin: true }
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
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}

export default MainNav;
