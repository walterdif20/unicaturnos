import { useMemo, useState } from 'react';
import { DEFAULT_DAYS, DEFAULT_SCHEDULE } from '../constants';

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
  manualBookableHours
}) {
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const [activeAdminPanel, setActiveAdminPanel] = useState('canchas');
  const [selectedDayFilter, setSelectedDayFilter] = useState('all');

  const filteredAdminBookings = useMemo(() => {
    if (selectedDayFilter === 'all') return adminBookings;

    return adminBookings.filter((booking) => {
      if (!booking.date) return false;
      const bookingDay = new Date(`${booking.date}T00:00:00`).getDay();
      return bookingDay === Number(selectedDayFilter);
    });
  }, [adminBookings, selectedDayFilter]);

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
          className={activeAdminPanel === 'roles' ? 'nav-pill nav-pill-active' : 'nav-pill'}
          onClick={() => setActiveAdminPanel('roles')}
        >
          Gestión de roles
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
            <p className="admin-panel-subtitle">Tabla con reservas, cancha y datos del cliente.</p>

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

            <div className="day-filter-buttons" role="group" aria-label="Filtrar turnos por día de la semana">
              <button
                type="button"
                className={selectedDayFilter === 'all' ? 'nav-pill nav-pill-active' : 'nav-pill'}
                onClick={() => setSelectedDayFilter('all')}
              >
                Todos
              </button>
              {DEFAULT_DAYS.map((day, dayIndex) => (
                <button
                  key={day}
                  type="button"
                  className={selectedDayFilter === String(dayIndex) ? 'nav-pill nav-pill-active' : 'nav-pill'}
                  onClick={() => setSelectedDayFilter(String(dayIndex))}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Cancha</th>
                    <th>Nombre y apellido</th>
                    <th>Estado</th>
                    <th>WhatsApp</th>
                    <th>Confirmación</th>
                    <th>Cancelar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdminBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8}>No hay turnos reservados.</td>
                    </tr>
                  ) : (
                    filteredAdminBookings.map((booking) => {
                      const courtName = courts.find((court) => court.id === booking.courtId)?.name || booking.courtId;
                      const confirmUrl = buildWhatsappConfirmUrl(booking, courtName);

                      return (
                        <tr key={booking.id}>
                          <td data-label="Fecha">{booking.date || '-'}</td>
                          <td data-label="Hora">{booking.hour !== undefined && booking.hour !== null ? `${booking.hour}:00` : '-'}</td>
                          <td data-label="Cancha">{courtName}</td>
                          <td data-label="Nombre y apellido">{booking.userName || '-'}</td>
                          <td data-label="Estado">{booking.status || 'reservado'}</td>
                          <td data-label="WhatsApp">
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
                          <td data-label="Confirmación">
                            {booking.status === 'confirmado' ? (
                              <span className="confirm-check" aria-label="Turno confirmado" title="Turno confirmado">
                                ✓ Confirmado
                              </span>
                            ) : confirmUrl ? (
                              <a className="btn-secondary btn-confirm" href={confirmUrl} target="_blank" rel="noreferrer">
                                Solicitar confirmación
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td data-label="Cancelar">
                            <button type="button" className="btn-cancel" onClick={() => onCancelBooking(booking.id)}>
                              Cancelar turno
                            </button>
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
      </div>
    </section>
  );
}

export default AdminPage;
