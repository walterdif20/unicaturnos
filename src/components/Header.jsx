import logo from '../../logo.jpg';

function Header() {
  return (
    <header className="hero">
      <img src={logo} alt="Logo La Única" className="logo" />
      <div>
        <p className="eyebrow">La Única · Gestión deportiva</p>
        <h1>Sistema de turnos online</h1>
        <p>Reservá tu cancha en segundos, con disponibilidad en tiempo real y panel administrativo centralizado.</p>
      </div>
    </header>
  );
}

export default Header;
