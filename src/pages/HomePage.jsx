import complejo from '../../imagendelcomplejo.jpg';

function HomePage({ onGoToBookings }) {
  return (
    <section className="card home-card">
      <div className="home-hero">
        <h2>⚽️ ¡Bienvenid@ a La Única Quequén! 🎉</h2>
        <p>
          Gracias por comunicarte con nosotros 🙌 Te dejamos toda la info importante para reservar tu turno.
        </p>
        <button type="button" className="home-book-btn" onClick={onGoToBookings}>
          Reservar turno
        </button>
      </div>

      <article className="info-block">
        <h3>💰 Valor del turno: $58.800 (fijo)</h3>
        <p>👉 Se divide entre todos los jugadores:</p>
        <ul>
          <li>🟢 7 vs 7 = $4200 por persona</li>
          <li>🔵 6 vs 6 = $4900 por persona</li>
          <li>Y así sucesivamente…</li>
        </ul>
      </article>

      <article className="info-block">
        <h3>📲 Reservas y confirmación</h3>
        <ul>
          <li>Reservas únicamente por WhatsApp, así queda todo registrado.</li>
          <li>📩 El mismo día del turno, entre las 10:00 y 12:00 hs, te enviamos un mensaje de confirmación.</li>
          <li>⚠️ Si no lo recibís, ¡por favor comunicate con nosotros!</li>
        </ul>
      </article>

      <article className="info-block">
        <h3>👤 Persona responsable del turno</h3>
        <p>El turno se guarda a nombre de una persona responsable, quien se encargará de:</p>
        <ul>
          <li>✔️ Confirmar el turno</li>
          <li>✔️ Abonar el total</li>
          <li>✔️ Entregar las pecheras al finalizar</li>
        </ul>
      </article>

      <article className="info-block">
        <h3>¿Cómo se paga el turno?</h3>
        <ul>
          <li>El dueño del turno es quien junta el dinero del equipo.</li>
          <li>
            <strong>Efectivo:</strong> todos le pagan a una sola persona.
          </li>
          <li>
            <strong>Transferencia:</strong> todos transfieren a una misma cuenta, y esa cuenta es la única que transfiere a La
            Única Quequén.
          </li>
          <li>⚠️ Importante: para evitar confusiones, no se reciben pagos individuales.</li>
        </ul>
      </article>

      <p className="home-footer">¡Gracias por elegirnos y que disfruten del partido! 🥅🔥</p>

      <figure className="home-photo-block">
        <img src={complejo} alt="Cancha de fútbol de La Única Quequén" className="home-photo" />
        <figcaption>Viví la experiencia completa en nuestras canchas. ¡Te esperamos!</figcaption>
      </figure>
    </section>
  );
}

export default HomePage;
