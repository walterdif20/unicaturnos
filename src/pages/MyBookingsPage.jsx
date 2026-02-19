const WEEK_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const formatBookingDate = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00`);
  const weekDay = WEEK_DAYS[date.getDay()] || '';
  const dayOfMonth = date.getDate();
  return `${weekDay} ${dayOfMonth}`;
};

function MyBookingsPage({
  user,
  bookings,
  fixedBookings,
  courts,
  onCancelBooking,
  onCreateFixedBooking,
  onUpdateFixedStatus,
  onCancelFixedBooking,
  onGoLogin
}) {
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
                  {booking.source === 'fixed' ? ' · Fijo' : ''}
                </p>
              </div>
              <div className="booking-item-actions">
                {!booking.fixedId && (
                  <button type="button" className="btn-secondary" onClick={() => onCreateFixedBooking(booking)}>
                    Hacer fijo
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={() => onCancelBooking(booking.id)}>
                  Cancelar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="fixed-bookings-section">
        <h3>Mis turnos fijos</h3>
        {fixedBookings.length === 0 ? (
          <p>No tenés turnos fijos.</p>
        ) : (
          <ul className="bookings-list">
            {fixedBookings.map((fixedBooking) => (
              <li key={fixedBooking.id} className="booking-item">
                <div>
                  <strong>{courtNamesById[fixedBooking.courtId] || 'Cancha'}</strong>
                  <p>
                    Todos los {WEEK_DAYS[fixedBooking.weekday]?.toLowerCase()} - {fixedBooking.hour}:00 hs · Estado:{' '}
                    {fixedBooking.status}
                  </p>
                </div>
                <div className="booking-item-actions">
                  {fixedBooking.status === 'active' ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onUpdateFixedStatus(fixedBooking.id, 'paused')}
                    >
                      Pausar
                    </button>
                  ) : fixedBooking.status === 'paused' ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onUpdateFixedStatus(fixedBooking.id, 'active')}
                    >
                      Reactivar
                    </button>
                  ) : null}
                  {fixedBooking.status !== 'cancelled' && (
                    <button type="button" className="btn-cancel" onClick={() => onCancelFixedBooking(fixedBooking.id)}>
                      Cancelar fijo
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default MyBookingsPage;
