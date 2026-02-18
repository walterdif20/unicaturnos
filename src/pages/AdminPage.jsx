import { DEFAULT_DAYS, DEFAULT_SCHEDULE } from '../constants';

function AdminPage({
  courts,
  schedules,
  holidays,
  newCourtName,
  newHoliday,
  onChangeNewCourt,
  onChangeNewHoliday,
  onAddCourt,
  onRemoveCourt,
  onSaveScheduleHour,
  onAddHoliday,
  onRemoveHoliday,
  adminBookings
}) {
  return (
    <section className="card admin-card">
      <h2>Administración</h2>

      <div className="admin-panels">
        <article className="admin-panel">
          <h3>Canchas</h3>
          <p className="admin-panel-subtitle">CRUD de canchas, horarios por día y feriados.</p>

          <form onSubmit={onAddCourt} className="inline-form">
            <input
              type="text"
              placeholder="Nombre de la nueva cancha"
              value={newCourtName}
              onChange={(event) => onChangeNewCourt(event.target.value)}
            />
            <button type="submit">Agregar cancha</button>
          </form>

          {courts.map((court) => (
            <article key={`${court.id}-admin`} className="admin-court">
              <div className="admin-court-header">
                <h4>{court.name}</h4>
                <button type="button" onClick={() => onRemoveCourt(court.id)}>
                  Quitar cancha
                </button>
              </div>
              <div className="schedule-grid">
                {Object.entries(schedules[court.id] || DEFAULT_SCHEDULE).map(([day, schedule]) => (
                  <div key={`${court.id}-${day}`}>
                    <strong>{DEFAULT_DAYS[Number(day)]}</strong>
                    <label>
                      Desde
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={schedule.open}
                        onChange={(event) => onSaveScheduleHour(court.id, day, 'open', event.target.value)}
                      />
                    </label>
                    <label>
                      Hasta
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={schedule.close}
                        onChange={(event) => onSaveScheduleHour(court.id, day, 'close', event.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </article>
          ))}

          <h4>Feriados</h4>
          <form onSubmit={onAddHoliday} className="inline-form">
            <input type="date" value={newHoliday} onChange={(event) => onChangeNewHoliday(event.target.value)} />
            <button type="submit">Agregar feriado</button>
          </form>
          <ul>
            {holidays.map((holiday) => (
              <li key={holiday}>
                {holiday}
                <button type="button" onClick={() => onRemoveHoliday(holiday)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="admin-panel">
          <h3>Turnos reservados</h3>
          <p className="admin-panel-subtitle">Tabla con reservas, cancha y datos del cliente.</p>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Cancha</th>
                  <th>Nombre y apellido</th>
                  <th>WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {adminBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No hay turnos reservados.</td>
                  </tr>
                ) : (
                  adminBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>{booking.date || '-'}</td>
                      <td>{booking.hour !== undefined && booking.hour !== null ? `${booking.hour}:00` : '-'}</td>
                      <td>{courts.find((court) => court.id === booking.courtId)?.name || booking.courtId}</td>
                      <td>{booking.userName || '-'}</td>
                      <td>
                        {booking.userPhone ? (
                          <a
                            className="btn-whatsapp"
                            href={`https://wa.me/${booking.userPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            WhatsApp
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-panel">
          <h3>Gestión de roles</h3>
          <p className="admin-panel-subtitle">Panel reservado para administrar permisos de usuario.</p>
          <p>Próximamente podrás asignar y editar roles desde esta sección.</p>
        </article>
      </div>
    </section>
  );
}

export default AdminPage;
