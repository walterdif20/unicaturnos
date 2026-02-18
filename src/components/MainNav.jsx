const sections = [
  { id: 'landing', label: 'Reservas' },
  { id: 'registro', label: 'Mi cuenta' },
  { id: 'admin', label: 'Administración' }
];

function MainNav({ activeSection, onChangeSection }) {
  return (
    <nav className="main-nav" aria-label="Secciones principales">
      {sections.map((section) => (
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
