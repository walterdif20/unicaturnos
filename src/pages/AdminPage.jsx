import { useMemo, useState } from 'react';
import { DEFAULT_DAYS, DEFAULT_SCHEDULE } from '../constants';
import { toLocalDate } from '../utils/date';
import FootballRaffleScene from '../components/FootballRaffleScene';

function AdminPage({
  courts,
  schedules,
  holidays,
  newCourtName,
  newHoliday,
  courtPrice,
  newCourtPrice,
  onChangeNewCourt,
  onChangeNewHoliday,
  onChangeCourtPrice,
  onAddCourt,
  onSaveCourtPrice,
  onRemoveCourt,
  onSaveScheduleHour,
  onAddHoliday,
  onRemoveHoliday,
  adminBookings,
  onCancelBooking,
  roleSearch,
  onChangeRoleSearch,
  selectedRoleUser,
  onSelectRoleUser,
  onClearRoleSelection,
  roleSuggestions,
  adminUsers,
  onMakeAdmin,
  onRemoveAdmin,
  manualBookingData,
  onChangeManualBookingField,
  onCreateManualBooking,
  manualBookableDates,
  manualBookableCourts,
  manualBookableHours,
  onPrefillManualBooking,
  onMoveBooking,
  fixedBookings,
  onUpdateFixedStatus,
  onCancelFixedBooking,
  raffleDraft,
  raffleAnimating,
  raffleWinners,
  onChangeRaffleItemName,
  onSpinRaffle,
  onPublishRaffleWinner
}) {
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const today = toLocalDate(new Date());
  const [activeAdminPanel, setActiveAdminPanel] = useState('canchas');
  const [dateFilterType, setDateFilterType] = useState('today');
  const [exactDateFilter, setExactDateFilter] = useState(today);
  const [rangeStartFilter, setRangeStartFilter] = useState(today);
  const [rangeEndFilter, setRangeEndFilter] = useState(today);
  const [selectedCourtFilter, setSelectedCourtFilter] = useState('all');
  const [showFreeSlots, setShowFreeSlots] = useState(false);
  const [movingBookingId, setMovingBookingId] = useState('');
  const [moveDraft, setMoveDraft] = useState({ date: '', courtId: '', hour: '' });
  const [fixedDayFilter, setFixedDayFilter] = useState('all');



  const fixedBookingsForAdmin = useMemo(() => {
    if (fixedDayFilter === 'all') return fixedBookings;
    return fixedBookings.filter((booking) => Number(booking.weekday) === Number(fixedDayFilter));
  }, [fixedBookings, fixedDayFilter]);

  const visibleDates = useMemo(() => {
    if (dateFilterType === 'today') return [today];
    if (dateFilterType === 'exact' && exactDateFilter) return [exactDateFilter];
    if (dateFilterType === 'range') {
      const start = rangeStartFilter || rangeEndFilter;
      const end = rangeEndFilter || rangeStartFilter;
      if (!start || !end) return [];
      const normalizedStart = start <= end ? start : end;
      const normalizedEnd = start <= end ? end : start;
      const dates = [];
      const cursor = new Date(`${normalizedStart}T00:00:00`);
      const last = new Date(`${normalizedEnd}T00:00:00`);

      while (cursor <= last && dates.length < 45) {
        dates.push(toLocalDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      return dates;
    }

    return [];
  }, [dateFilterType, exactDateFilter, rangeStartFilter, rangeEndFilter, today]);

  const bookingsBySlot = useMemo(() => {
    const mapped = new Map();
    adminBookings.forEach((booking) => {
      mapped.set(`${booking.date}-${booking.courtId}-${booking.hour}`, booking);
    });
    return mapped;
  }, [adminBookings]);

  const groupedAdminBookings = useMemo(() => {
    const groups = [];

    visibleDates.forEach((date) => {
      const dayIndex = new Date(`${date}T00:00:00`).getDay();
      const courtsForDate = selectedCourtFilter === 'all' ? courts : courts.filter((court) => court.id === selectedCourtFilter);

      courtsForDate.forEach((court) => {
        const daySchedule = (schedules[court.id] || DEFAULT_SCHEDULE)[dayIndex];
        const hours = daySchedule && daySchedule.open < daySchedule.close
          ? Array.from({ length: daySchedule.close - daySchedule.open }, (_, idx) => daySchedule.open + idx)
          : [];

        const rows = hours.reduce((acc, hour) => {
          const booking = bookingsBySlot.get(`${date}-${court.id}-${hour}`);
          if (booking) {
            acc.push({ type: 'reserved', booking, hour });
            return acc;
          }
          if (showFreeSlots) {
            acc.push({ type: 'free', date, courtId: court.id, courtName: court.name, hour });
          }
          return acc;
        }, []);

        if (rows.length > 0) {
          groups.push({
            key: `${date}-${court.id}`,
            date,
            dayName: DEFAULT_DAYS[dayIndex],
            court,
            rows
          });
        }
      });
    });

    return groups;
  }, [visibleDates, selectedCourtFilter, courts, schedules, bookingsBySlot, showFreeSlots]);

  const moveDates = useMemo(() => {
    const allDates = [...new Set([...visibleDates, ...manualBookableDates])].sort();
    return allDates.length > 0 ? allDates : [today];
  }, [visibleDates, manualBookableDates, today]);

  const moveHours = useMemo(() => {
    if (!moveDraft.date || !moveDraft.courtId) return [];
    const dayIndex = new Date(`${moveDraft.date}T00:00:00`).getDay();
    const daySchedule = (schedules[moveDraft.courtId] || DEFAULT_SCHEDULE)[dayIndex];
    if (!daySchedule || daySchedule.open >= daySchedule.close) return [];

    return Array.from({ length: daySchedule.close - daySchedule.open }, (_, idx) => daySchedule.open + idx).filter((hour) => {
      const found = bookingsBySlot.get(`${moveDraft.date}-${moveDraft.courtId}-${hour}`);
      return !found || found.id === movingBookingId;
    });
  }, [moveDraft.date, moveDraft.courtId, schedules, bookingsBySlot, movingBookingId]);

  const buildConfirmationLink = (booking) => {
    if (!appOrigin || !booking?.id) return '';
    const token = booking.confirmationToken || booking.id;
    return `${appOrigin}?confirmBooking=${booking.id}&token=${token}`;
  };

  const buildWhatsappConfirmUrl = (booking, courtName) => {
    if (!booking?.userPhone) return '';
    const confirmationLink = buildConfirmationLink(booking);
    if (!confirmationLink) return '';

    const message = `Hola ${booking.userName || ''}, por favor confirmá tu turno en ${courtName || 'la cancha'} el ${booking.date} a las ${booking.hour}:00 ingresando aquí: ${confirmationLink}`;
    return `https://wa.me/${booking.userPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message.trim())}`;
  };

  return (
    <section className="card admin-card">
      <h2>Administración</h2>

      <div className="admin-panel-nav" role="tablist" aria-label="Paneles de administración">
        <button
          type="button"
          className={activeAdminPanel === 'canchas' ? 'nav-pill nav-pill-active' : 'nav-pill'}
          onClick={() => setActiveAdminPanel('canchas')}
        >
          Gestión de canchas
        </button>
        <button
          type="button"
          className={activeAdminPanel === 'turnos' ? 'nav-pill nav-pill-active' : 'nav-pill'}
          onClick={() => setActiveAdminPanel('turnos')}
        >
          Turnos
        </button>
        <button
          type="button"
          className={activeAdminPanel === 'turnos-fijos' ? 'nav-pill nav-pill-active' : 'nav-pill'}
          onClick={() => setActiveAdminPanel('turnos-fijos')}
        >
          Turnos fijos
        </button>
        <button
          type="button"
          className={activeAdminPanel === 'roles' ? 'nav-pill nav-pill-active' : 'nav-pill'}
          onClick={() => setActiveAdminPanel('roles')}
        >
          Gestión de roles
        </button>
        <button
          type="button"
          className={activeAdminPanel === 'sorteos' ? 'nav-pill nav-pill-active' : 'nav-pill'}
          onClick={() => setActiveAdminPanel('sorteos')}
        >
          Sorteos
        </button>
      </div>

      <div className="admin-panels">
        {activeAdminPanel === 'canchas' && (
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


            <h4>Precio de la cancha</h4>
            <form onSubmit={onSaveCourtPrice} className="inline-form">
              <input
                type="number"
                step="any"
                value={newCourtPrice}
                onChange={(event) => onChangeCourtPrice(event.target.value)}
                placeholder="Valor total de la cancha"
              />
              <button type="submit">Actualizar precio</button>
            </form>
            <p className="admin-panel-subtitle">Valor actual: ${courtPrice.toLocaleString('es-AR')}.</p>

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
        )}

        {activeAdminPanel === 'turnos' && (
          <article className="admin-panel">
            <h3>Turnos reservados</h3>
            <p className="admin-panel-subtitle">Visualización agrupada por día/cancha, filtros avanzados y acciones rápidas.</p>

            <section className="manual-booking-card">
              <h4>Cargar turno manual</h4>
              <p className="admin-panel-subtitle">
                Usá esta herramienta para reservar un turno a nombre de una persona sin cuenta.
              </p>

              <form className="manual-booking-form" onSubmit={onCreateManualBooking}>
                <label>
                  Fecha
                  <select
                    value={manualBookingData.date}
                    onChange={(event) => onChangeManualBookingField('date', event.target.value)}
                    disabled={manualBookableDates.length === 0}
                  >
                    {manualBookableDates.length === 0 && <option value="">Sin fechas disponibles</option>}
                    {manualBookableDates.map((date) => (
                      <option key={date} value={date}>
                        {date}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Cancha
                  <select
                    value={manualBookingData.courtId}
                    onChange={(event) => onChangeManualBookingField('courtId', event.target.value)}
                    disabled={manualBookableCourts.length === 0}
                  >
                    {manualBookableCourts.length === 0 && <option value="">Sin canchas disponibles</option>}
                    {manualBookableCourts.map((court) => (
                      <option key={court.id} value={court.id}>
                        {court.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Horario
                  <select
                    value={manualBookingData.hour}
                    onChange={(event) => onChangeManualBookingField('hour', event.target.value)}
                    disabled={manualBookableHours.length === 0}
                  >
                    {manualBookableHours.length === 0 && <option value="">Sin horarios disponibles</option>}
                    {manualBookableHours.map((hour) => (
                      <option key={`${manualBookingData.courtId}-${hour}`} value={hour}>
                        {hour}:00
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Nombre
                  <input
                    type="text"
                    value={manualBookingData.firstName}
                    onChange={(event) => onChangeManualBookingField('firstName', event.target.value)}
                    placeholder="Nombre"
                  />
                </label>

                <label>
                  Apellido
                  <input
                    type="text"
                    value={manualBookingData.lastName}
                    onChange={(event) => onChangeManualBookingField('lastName', event.target.value)}
                    placeholder="Apellido"
                  />
                </label>

                <label>
                  Teléfono
                  <input
                    type="tel"
                    value={manualBookingData.phone}
                    onChange={(event) => onChangeManualBookingField('phone', event.target.value)}
                    placeholder="+54 11 1234-5678"
                  />
                </label>

                <button
                  type="submit"
                  disabled={manualBookableDates.length === 0 || manualBookableCourts.length === 0 || manualBookableHours.length === 0}
                >
                  Cargar turno manual
                </button>
              </form>
            </section>

            <section className="manual-booking-card">
              <h4>Filtros de turnos</h4>
              <div className="day-filter-buttons" role="group" aria-label="Filtro por período">
                <button type="button" className={dateFilterType === 'today' ? 'nav-pill nav-pill-active' : 'nav-pill'} onClick={() => setDateFilterType('today')}>
                  Hoy
                </button>
                <button type="button" className={dateFilterType === 'exact' ? 'nav-pill nav-pill-active' : 'nav-pill'} onClick={() => setDateFilterType('exact')}>
                  Fecha exacta
                </button>
                <button type="button" className={dateFilterType === 'range' ? 'nav-pill nav-pill-active' : 'nav-pill'} onClick={() => setDateFilterType('range')}>
                  Rango de fechas
                </button>
              </div>

              {dateFilterType === 'exact' ? (
                <label>
                  Fecha
                  <input type="date" value={exactDateFilter} onChange={(event) => setExactDateFilter(event.target.value)} />
                </label>
              ) : null}

              {dateFilterType === 'range' ? (
                <div className="admin-filters-grid">
                  <label>
                    Desde
                    <input type="date" value={rangeStartFilter} onChange={(event) => setRangeStartFilter(event.target.value)} />
                  </label>
                  <label>
                    Hasta
                    <input type="date" value={rangeEndFilter} onChange={(event) => setRangeEndFilter(event.target.value)} />
                  </label>
                </div>
              ) : null}

              <div className="admin-filters-grid">
                <label>
                  Cancha
                  <select value={selectedCourtFilter} onChange={(event) => setSelectedCourtFilter(event.target.value)}>
                    <option value="all">Todas</option>
                    {courts.map((court) => (
                      <option key={`filter-${court.id}`} value={court.id}>
                        {court.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="checkbox-label">
                  <input type="checkbox" checked={showFreeSlots} onChange={(event) => setShowFreeSlots(event.target.checked)} />
                  Mostrar registros libres
                </label>
              </div>
            </section>

            {movingBookingId ? (
              <section className="manual-booking-card">
                <h4>Mover turno reservado</h4>
                <div className="admin-filters-grid">
                  <label>
                    Fecha nueva
                    <select value={moveDraft.date} onChange={(event) => setMoveDraft((prev) => ({ ...prev, date: event.target.value, hour: '' }))}>
                      {moveDates.map((date) => (
                        <option key={`move-date-${date}`} value={date}>{date}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Cancha nueva
                    <select value={moveDraft.courtId} onChange={(event) => setMoveDraft((prev) => ({ ...prev, courtId: event.target.value, hour: '' }))}>
                      {courts.map((court) => (
                        <option key={`move-court-${court.id}`} value={court.id}>{court.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Hora nueva
                    <select value={moveDraft.hour} onChange={(event) => setMoveDraft((prev) => ({ ...prev, hour: event.target.value }))}>
                      {moveHours.length === 0 ? <option value="">Sin horarios libres</option> : null}
                      {moveHours.map((hour) => (
                        <option key={`move-hour-${hour}`} value={hour}>{hour}:00</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="role-actions">
                  <button
                    type="button"
                    disabled={!moveDraft.date || !moveDraft.courtId || moveDraft.hour === ''}
                    onClick={() => {
                      onMoveBooking(movingBookingId, {
                        date: moveDraft.date,
                        courtId: moveDraft.courtId,
                        hour: Number(moveDraft.hour)
                      });
                      setMovingBookingId('');
                    }}
                  >
                    Guardar cambios
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setMovingBookingId('')}>
                    Cancelar edición
                  </button>
                </div>
              </section>
            ) : null}

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Día / Fecha</th>
                    <th>Cancha</th>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>WhatsApp</th>
                    <th>Confirmación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedAdminBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8}>No hay registros para los filtros seleccionados.</td>
                    </tr>
                  ) : (
                    groupedAdminBookings.flatMap((group) =>
                      group.rows.map((row, rowIndex) => {
                        if (row.type === 'free') {
                          return (
                            <tr key={`${group.key}-free-${row.hour}`} className="free-slot-row">
                              <td data-label="Día / Fecha">{group.dayName} · {group.date}</td>
                              <td data-label="Cancha">{group.court.name}</td>
                              <td data-label="Hora">{row.hour}:00</td>
                              <td data-label="Cliente">-</td>
                              <td data-label="Estado">Libre</td>
                              <td data-label="WhatsApp">-</td>
                              <td data-label="Confirmación">-</td>
                              <td data-label="Acciones">
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => onPrefillManualBooking({ date: row.date, courtId: row.courtId, hour: row.hour })}
                                >
                                  Reservar
                                </button>
                              </td>
                            </tr>
                          );
                        }

                        const booking = row.booking;
                        const confirmUrl = buildWhatsappConfirmUrl(booking, group.court.name);
                        return (
                          <tr key={booking.id}>
                            <td data-label="Día / Fecha">{rowIndex === 0 ? `${group.dayName} · ${group.date}` : ''}</td>
                            <td data-label="Cancha">{group.court.name}</td>
                            <td data-label="Hora">{booking.hour}:00</td>
                            <td data-label="Cliente">{booking.userName || '-'}</td>
                            <td data-label="Estado">{booking.status || 'reservado'}</td>
                            <td data-label="WhatsApp">
                              {booking.userPhone ? (
                                <a className="btn-whatsapp" href={`https://wa.me/${booking.userPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                                  WhatsApp
                                </a>
                              ) : '-'}
                            </td>
                            <td data-label="Confirmación">
                              {booking.status === 'confirmado' ? (
                                <span className="confirm-check">✓ Confirmado</span>
                              ) : confirmUrl ? (
                                <a className="btn-secondary btn-confirm" href={confirmUrl} target="_blank" rel="noreferrer">
                                  Solicitar confirmación
                                </a>
                              ) : '-'}
                            </td>
                            <td data-label="Acciones">
                              <div className="admin-actions-cell">
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => {
                                    setMovingBookingId(booking.id);
                                    setMoveDraft({ date: booking.date || moveDates[0] || today, courtId: booking.courtId || courts[0]?.id || '', hour: String(booking.hour ?? '') });
                                  }}
                                >
                                  Modificar / mover
                                </button>
                                <button type="button" className="btn-cancel" onClick={() => onCancelBooking(booking.id)}>
                                  Cancelar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )
                  )}
                </tbody>
              </table>
            </div>
          </article>
        )}

        {activeAdminPanel === 'turnos-fijos' && (
          <article className="admin-panel">
            <h3>Administración de turnos fijos</h3>
            <p className="admin-panel-subtitle">Sección dedicada para pausar, reactivar o cancelar turnos semanales.</p>
            <div className="day-filter-buttons" role="group" aria-label="Filtrar turnos fijos por día de la semana">
              <button
                type="button"
                className={fixedDayFilter === 'all' ? 'nav-pill nav-pill-active' : 'nav-pill'}
                onClick={() => setFixedDayFilter('all')}
              >
                Todos
              </button>
              {DEFAULT_DAYS.map((day, dayIndex) => (
                <button
                  key={`fixed-${day}`}
                  type="button"
                  className={fixedDayFilter === String(dayIndex) ? 'nav-pill nav-pill-active' : 'nav-pill'}
                  onClick={() => setFixedDayFilter(String(dayIndex))}
                >
                  {day}
                </button>
              ))}
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Cancha</th>
                    <th>Día</th>
                    <th>Hora</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {fixedBookingsForAdmin.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No hay turnos fijos.</td>
                    </tr>
                  ) : (
                    fixedBookingsForAdmin.map((fixedBooking) => {
                      const courtName = courts.find((court) => court.id === fixedBooking.courtId)?.name || fixedBooking.courtId;
                      return (
                        <tr key={fixedBooking.id}>
                          <td data-label="Cliente">{fixedBooking.userName || '-'}</td>
                          <td data-label="Cancha">{courtName}</td>
                          <td data-label="Día">{DEFAULT_DAYS[fixedBooking.weekday] || '-'}</td>
                          <td data-label="Hora">{fixedBooking.hour}:00</td>
                          <td data-label="Estado">{fixedBooking.status}</td>
                          <td data-label="Acciones">
                            {fixedBooking.status === 'active' ? (
                              <button type="button" className="btn-secondary" onClick={() => onUpdateFixedStatus(fixedBooking.id, 'paused')}>
                                Pausar
                              </button>
                            ) : fixedBooking.status === 'paused' ? (
                              <button type="button" className="btn-secondary" onClick={() => onUpdateFixedStatus(fixedBooking.id, 'active')}>
                                Reactivar
                              </button>
                            ) : null}
                            {fixedBooking.status !== 'cancelled' && (
                              <button type="button" className="btn-cancel" onClick={() => onCancelFixedBooking(fixedBooking.id)}>
                                Cancelar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </article>
        )}

        {activeAdminPanel === 'roles' && (
          <article className="admin-panel">
            <h3>Gestión de roles</h3>
            <p className="admin-panel-subtitle">Asigná o quitá permisos de administrador.</p>

            <div className="role-manager">
              <label className="role-search">
                Buscar usuario por email
                <input
                  type="text"
                  placeholder="ejemplo@correo.com"
                  value={roleSearch}
                  onChange={(event) => onChangeRoleSearch(event.target.value)}
                />
              </label>

              {roleSuggestions.length > 0 && (
                <ul className="role-suggestions">
                  {roleSuggestions.map((user) => (
                    <li key={user.id}>
                      <span>{user.email}</span>
                      <button type="button" className="btn-secondary" onClick={() => onSelectRoleUser(user)}>
                        Seleccionar
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {selectedRoleUser ? (
                <div className="role-selected-user">
                  <p>
                    Usuario seleccionado: <strong>{selectedRoleUser.email}</strong>
                  </p>
                  <div className="role-actions">
                    <button type="button" onClick={() => onMakeAdmin(selectedRoleUser.id)}>
                      Hacer administrador
                    </button>
                    <button type="button" className="btn-secondary" onClick={onClearRoleSelection}>
                      Limpiar selección
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="admin-users-list">
              <h4>Administradores actuales</h4>
              {adminUsers.length === 0 ? (
                <p>No hay administradores asignados.</p>
              ) : (
                <ul>
                  {adminUsers.map((adminUser) => (
                    <li key={adminUser.id}>
                      <span>{adminUser.email}</span>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => onRemoveAdmin(adminUser.id)}
                      >
                        Quitar admin
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        )}

        {activeAdminPanel === 'sorteos' && (
          <article className="admin-panel raffle-panel">
            <h3>Ruleta de sorteos</h3>
            <p className="admin-panel-subtitle">Elegí el artículo, girá la ruleta y publicá el resultado oficial.</p>

            <label>
              Artículo a sortear
              <input
                type="text"
                placeholder="Ej: Camiseta oficial"
                value={raffleDraft.itemName}
                onChange={(event) => onChangeRaffleItemName(event.target.value)}
              />
            </label>

            <div className={raffleAnimating ? 'raffle-wheel raffle-wheel-spinning' : 'raffle-wheel'}>
              <FootballRaffleScene spinning={raffleAnimating} />
              <p className="raffle-wheel-title">El ganador de {raffleDraft.itemName || '...'} es:</p>
              <p className="raffle-wheel-name">{raffleDraft.winnerName || '🎁 Girá la ruleta 🎁'}</p>
            </div>

            <div className="raffle-actions">
              <button type="button" onClick={onSpinRaffle} disabled={raffleAnimating}>
                {raffleAnimating ? 'Girando...' : 'Girar ruleta'}
              </button>
              <button type="button" className="btn-secondary" onClick={onPublishRaffleWinner} disabled={raffleAnimating || !raffleDraft.winnerId}>
                Hacer oficial el sorteo
              </button>
              {raffleDraft.winnerPhone ? (
                <a className="btn-whatsapp" href={`https://wa.me/${raffleDraft.winnerPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                  Contactar ganador por WhatsApp
                </a>
              ) : null}
            </div>

            <section>
              <h4>Ganadores de los últimos sorteos</h4>
              {raffleWinners.length === 0 ? (
                <p>Todavía no hay resultados publicados.</p>
              ) : (
                <ul className="raffle-history-list">
                  {raffleWinners.map((raffle) => (
                    <li key={raffle.id} className="raffle-history-item">
                      <span>
                        {raffle.drawDate} · {raffle.itemName} · <strong>{raffle.winnerName}</strong>
                      </span>
                      {raffle.winnerPhone ? (
                        <a
                          className="btn-whatsapp"
                          href={`https://wa.me/${raffle.winnerPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </article>
        )}
      </div>
    </section>
  );
}

export default AdminPage;
