const WEEK_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const formatBookingDate = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00`);
  const weekDay = WEEK_DAYS[date.getDay()] || '';
  const dayOfMonth = date.getDate();
  return `${weekDay} ${dayOfMonth}`;
};

function MyBookingsPage({ user, bookings, courts, onCancelBooking, onGoLogin }) {
  if (!user) {
    return (
      <section className="card auth-card">
        <h2>Mis reservas</h2>
        <p>Iniciá sesión para ver y administrar tus reservas.</p>
        <button type="button" onClick={onGoLogin}>
          Iniciar sesión
        </button>
      </section>
    );
  }

  const courtNamesById = courts.reduce((acc, court) => {
    acc[court.id] = court.name;
    return acc;
  }, {});

  return (
    <section className="card my-bookings-card">
      <h2>Mis reservas</h2>
      {bookings.length === 0 ? (
        <p>No tenés reservas activas.</p>
      ) : (
        <ul className="bookings-list">
          {bookings.map((booking) => (
            <li key={booking.id} className="booking-item">
              <div>
                <strong>{courtNamesById[booking.courtId] || 'Cancha'}</strong>
                <p>
                  {formatBookingDate(booking.date)} - {booking.hour}:00 hs
                </p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => onCancelBooking(booking.id)}>
                Cancelar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default MyBookingsPage;
