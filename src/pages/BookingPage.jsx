import { useEffect, useMemo, useState } from 'react';
import complejo from '../../imagendelcomplejo.jpg';
import { DEFAULT_DAYS } from '../constants';
import { formatLongDate, getArgentinaNow } from '../utils/date';

const toArgentinaDate = (date, hour = 0, minute = 0) => {
  const safeHour = String(hour).padStart(2, '0');
  const safeMinute = String(minute).padStart(2, '0');
  return new Date(`${date}T${safeHour}:${safeMinute}:00-03:00`);
};

const getNextBookingCountdown = (bookings = []) => {
  const now = getArgentinaNow();
  const nowDate = toArgentinaDate(now.date, now.hour, now.minute);

  const upcomingBookings = bookings
    .map((booking) => ({
      ...booking,
      startsAt: toArgentinaDate(booking.date, booking.hour, 0)
    }))
    .filter((booking) => booking.startsAt.getTime() > nowDate.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  if (upcomingBookings.length === 0) return null;

  const nextBooking = upcomingBookings[0];
  const diffMs = nextBooking.startsAt.getTime() - nowDate.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return {
    booking: nextBooking,
    days,
    hours,
    minutes
  };
};

function BookingPage({
  user,
  courtPrice,
  myBookings,
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
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const selectedDateIndex = upcomingDates.indexOf(selectedDate);
  const canGoPrev = selectedDateIndex > 0;
  const canGoNext = selectedDateIndex < upcomingDates.length - 1;
  const isHoliday = holidays.includes(selectedDate);
  const dayIndex = new Date(`${selectedDate}T00:00:00`).getDay();
  const perPlayer7v7 = Math.round(courtPrice / 14);
  const perPlayer6v6 = Math.round(courtPrice / 12);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const nextBookingCountdown = useMemo(() => getNextBookingCountdown(myBookings), [myBookings, countdownNow]);

  return (
    <section className="card landing-card">
      <img src={complejo} alt="Complejo La Única" className="banner" />

      {user && nextBookingCountdown && (
        <div className="next-booking-alert" role="status" aria-live="polite">
          ⏳ Ya tenés un turno reservado: faltan <strong>{nextBookingCountdown.days}</strong> días,
          <strong> {nextBookingCountdown.hours}</strong> horas y <strong>{nextBookingCountdown.minutes}</strong> minutos
          para tu próximo turno.
        </div>
      )}

      <details className="booking-info" open>
        <summary>ℹ️ Información importante del turno</summary>
        <div className="booking-info-content">
          <p>
            <strong>Valor del turno:</strong> ${courtPrice.toLocaleString('es-AR')}.
          </p>
          <p>
            Se divide entre todos los jugadores: 7 vs 7 = ${perPlayer7v7.toLocaleString('es-AR')} por persona, 6 vs 6 = ${perPlayer6v6.toLocaleString('es-AR')} por persona y así sucesivamente.
          </p>
          <p>
            Reservas únicamente por WhatsApp. El mismo día del turno (10:00 a 12:00 hs) enviamos mensaje de
            confirmación.
          </p>
          <p>
            El turno queda a nombre de una persona responsable que confirma, abona el total y entrega las pecheras al
            finalizar.
          </p>
          <p>
            <strong>Pagos:</strong> efectivo (todos le pagan a una sola persona) o transferencia (todos a una misma cuenta,
            que es la única que transfiere a La Única Quequén). No se reciben pagos individuales.
          </p>
        </div>
      </details>

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

      <div className="beelup-cta">
        <p>
          Recordá que podés ver el video de tus partidos en Beelup buscando La Única Quequén.
        </p>
        <a
          href="https://beelup.com/ar"
          target="_blank"
          rel="noreferrer"
          className="beelup-link"
        >
          Ver en Beelup
        </a>
      </div>
    </section>
  );
}

export default BookingPage;
