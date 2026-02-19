import logo from '../../logo.jpg';

function Header() {
  return (
    <header className="hero">
      <img src={logo} alt="Logo La Única" className="logo" />
      <div>
        <p className="eyebrow">La Única · Complejo deportivo</p>
        <h1>Turnos online</h1>
        <p style={{margin:'1px'}}>¡Que no te ganen de mano!</p>
        <p>Reservá tu cancha en segundos, con disponibilidad en tiempo real.</p>
      </div>
    </header>
  );
}

export default Header;
