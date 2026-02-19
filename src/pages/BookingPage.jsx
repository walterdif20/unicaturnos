import complejo from '../../imagendelcomplejo.jpg';
import { DEFAULT_DAYS } from '../constants';
import { formatLongDate } from '../utils/date';

function BookingPage({
  user,
  selectedDate,
  upcomingDates,
  holidays,
  slotsByCourt,
  bookingsByCourtHour,
  onChangeDate,
  onBookSlot,
  onGoLogin,
  onGoRegister,
  bookingInProgress
}) {
  const selectedDateIndex = upcomingDates.indexOf(selectedDate);
  const canGoPrev = selectedDateIndex > 0;
  const canGoNext = selectedDateIndex < upcomingDates.length - 1;
  const isHoliday = holidays.includes(selectedDate);
  const dayIndex = new Date(`${selectedDate}T00:00:00`).getDay();

  return (
    <section className="card landing-card">
      <img src={complejo} alt="Complejo La Única" className="banner" />
      <div className="landing-topbar">
        <div>
          <h2>Disponibilidad por cancha</h2>
          <p className="date-title">{formatLongDate(selectedDate)}</p>
        </div>
        {!user && (
          <div className="landing-actions">
            <button type="button" className="btn-secondary" onClick={onGoLogin}>
              Iniciar sesión
            </button>
            <button type="button" onClick={onGoRegister}>
              Registrarse
            </button>
          </div>
        )}
      </div>

      <div className="week-nav">
        <button type="button" className="btn-secondary" onClick={() => onChangeDate(upcomingDates[selectedDateIndex - 1])} disabled={!canGoPrev}>
          ← Día anterior
        </button>
        <div className="week-chips" role="tablist" aria-label="Próximos siete días">
          {upcomingDates.map((date) => (
            <button
              key={date}
              type="button"
              role="tab"
              aria-selected={date === selectedDate}
              className={date === selectedDate ? 'day-chip day-chip-active' : 'day-chip'}
              onClick={() => onChangeDate(date)}
            >
              {DEFAULT_DAYS[new Date(`${date}T00:00:00`).getDay()]} {date.slice(8)}
            </button>
          ))}
        </div>
        <button type="button" className="btn-secondary" onClick={() => onChangeDate(upcomingDates[selectedDateIndex + 1])} disabled={!canGoNext}>
          Día siguiente →
        </button>
      </div>

      {isHoliday && <p className="holiday-alert">Este día es feriado. No hay turnos disponibles.</p>}

      {!isHoliday &&
        slotsByCourt.map((court) => (
          <article key={court.id} className="court-block">
            <h3>{court.name}</h3>
            <div className="slot-grid">
              {court.hours.length === 0 && <p>Sin horarios configurados para {DEFAULT_DAYS[dayIndex]}.</p>}
              {court.hours.map((hour) => {
                const slotKey = `${court.id}-${hour}`;
                const booked = bookingsByCourtHour[slotKey];
                return (
                  <button
                    key={slotKey}
                    type="button"
                    disabled={Boolean(booked) || bookingInProgress}
                    className={booked ? 'slot slot-booked' : 'slot slot-open'}
                    onClick={() => onBookSlot(court.id, hour)}
                  >
                    {hour}:00 {booked ? '· Reservado' : '· Disponible'}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
    </section>
  );
}

export default BookingPage;
