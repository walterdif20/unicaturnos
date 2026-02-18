const sections = [
  { id: 'landing', label: 'Reservas' },
  { id: 'registro', label: 'Mi cuenta' },
  { id: 'mis-reservas', label: 'Mis reservas' },
  { id: 'admin', label: 'Administración', requiresAdmin: true }
];

function MainNav({ activeSection, onChangeSection, canAccessAdmin }) {
  const visibleSections = sections.filter((section) => !section.requiresAdmin || canAccessAdmin);

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
