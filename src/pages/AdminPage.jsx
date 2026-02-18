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
  onRemoveHoliday
}) {
  return (
    <section className="card admin-card">
      <h2>Administración</h2>

      <h3>Canchas y horarios</h3>
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

      <h3>Feriados</h3>
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
    </section>
  );
}

export default AdminPage;
