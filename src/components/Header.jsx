import logo from '../../logo.jpg';

function Header() {
  return (
    <header className="hero">
      <img src={logo} alt="Logo La Única" className="logo" />
      <div>
        <h1>La Única - Sistema de Turnos</h1>
        <p>Reservá tu cancha de fútbol en segundos y administrá horarios, feriados y disponibilidad.</p>
      </div>
    </header>
  );
}

export default Header;
