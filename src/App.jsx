import { useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { auth, db } from './firebase';
import logo from '../logo.jpg';
import complejo from '../imagendelcomplejo.jpg';

const DEFAULT_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DEFAULT_SCHEDULE = {
  0: { open: 9, close: 23 },
  1: { open: 9, close: 23 },
  2: { open: 9, close: 23 },
  3: { open: 9, close: 23 },
  4: { open: 9, close: 23 },
  5: { open: 9, close: 24 },
  6: { open: 9, close: 24 }
};

const emptyRegister = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  password: ''
};

const emptyLogin = { email: '', password: '' };

const toLocalDate = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const getHours = (scheduleForDay) => {
  if (!scheduleForDay) return [];
  const { open, close } = scheduleForDay;
  if (open >= close) return [];
  return Array.from({ length: close - open }, (_, idx) => open + idx);
};

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [courts, setCourts] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [bookingsByCourtHour, setBookingsByCourtHour] = useState({});
  const [selectedDate, setSelectedDate] = useState(toLocalDate(new Date()));
  const [authError, setAuthError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [registerData, setRegisterData] = useState(emptyRegister);
  const [loginData, setLoginData] = useState(emptyLogin);
  const [newCourtName, setNewCourtName] = useState('');
  const [newHoliday, setNewHoliday] = useState('');

  const isHoliday = holidays.includes(selectedDate);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (!authUser) {
        setProfile(null);
        return;
      }
      const userDoc = await getDoc(doc(db, 'users', authUser.uid));
      if (userDoc.exists()) {
        setProfile(userDoc.data());
      }
    });

    return () => unsub();
  }, []);

  const loadCoreData = async (date) => {
    const courtsSnapshot = await getDocs(collection(db, 'courts'));
    const courtsData = courtsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    setCourts(courtsData);

    const scheduleEntries = {};
    await Promise.all(
      courtsData.map(async (court) => {
        const scheduleDoc = await getDoc(doc(db, 'schedules', court.id));
        scheduleEntries[court.id] = scheduleDoc.exists() ? scheduleDoc.data() : DEFAULT_SCHEDULE;
      })
    );
    setSchedules(scheduleEntries);

    const holidayDoc = await getDoc(doc(db, 'settings', 'holidays'));
    const holidayDates = holidayDoc.exists() ? holidayDoc.data().dates || [] : [];
    setHolidays(holidayDates);

    const bookingSnapshot = await getDocs(query(collection(db, 'bookings'), where('date', '==', date)));
    const bookedMap = {};
    bookingSnapshot.forEach((booking) => {
      const data = booking.data();
      bookedMap[`${data.courtId}-${data.hour}`] = { id: booking.id, ...data };
    });
    setBookingsByCourtHour(bookedMap);
  };

  useEffect(() => {
    loadCoreData(selectedDate);
  }, [selectedDate]);

  const registerUser = async (event) => {
    event.preventDefault();
    setAuthError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        phone: registerData.phone,
        email: registerData.email
      });
      setRegisterData(emptyRegister);
      setStatusMessage('Registro exitoso. Ya podés reservar tu turno.');
    } catch (error) {
      setAuthError('No se pudo registrar. Revisá los datos ingresados.');
    }
  };

  const loginUser = async (event) => {
    event.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
      setLoginData(emptyLogin);
    } catch (error) {
      setAuthError('Credenciales inválidas.');
    }
  };

  const logoutUser = async () => {
    await signOut(auth);
  };

  const bookSlot = async (courtId, hour) => {
    if (!user) {
      setStatusMessage('Necesitás iniciar sesión para reservar.');
      return;
    }
    const slotKey = `${courtId}-${hour}`;
    if (bookingsByCourtHour[slotKey]) return;

    await addDoc(collection(db, 'bookings'), {
      courtId,
      hour,
      date: selectedDate,
      userId: user.uid,
      userName: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
      userPhone: profile?.phone || '',
      createdAt: serverTimestamp()
    });

    setStatusMessage(`Turno reservado para las ${hour}:00.`);
    await loadCoreData(selectedDate);
  };

  const addCourt = async (event) => {
    event.preventDefault();
    if (!newCourtName.trim()) return;
    const created = await addDoc(collection(db, 'courts'), { name: newCourtName.trim() });
    await setDoc(doc(db, 'schedules', created.id), DEFAULT_SCHEDULE);
    setNewCourtName('');
    setStatusMessage('Cancha agregada correctamente.');
    await loadCoreData(selectedDate);
  };

  const removeCourt = async (courtId) => {
    await deleteDoc(doc(db, 'courts', courtId));
    await deleteDoc(doc(db, 'schedules', courtId));
    setStatusMessage('Cancha eliminada.');
    await loadCoreData(selectedDate);
  };

  const saveScheduleHour = async (courtId, dayIndex, field, value) => {
    const currentSchedule = schedules[courtId] || DEFAULT_SCHEDULE;
    const updated = {
      ...currentSchedule,
      [dayIndex]: {
        ...currentSchedule[dayIndex],
        [field]: Number(value)
      }
    };
    await setDoc(doc(db, 'schedules', courtId), updated);
    setSchedules((prev) => ({ ...prev, [courtId]: updated }));
  };

  const addHoliday = async (event) => {
    event.preventDefault();
    if (!newHoliday || holidays.includes(newHoliday)) return;
    const updated = [...holidays, newHoliday].sort();
    await setDoc(doc(db, 'settings', 'holidays'), { dates: updated });
    setHolidays(updated);
    setNewHoliday('');
  };

  const removeHoliday = async (date) => {
    const updated = holidays.filter((holiday) => holiday !== date);
    await setDoc(doc(db, 'settings', 'holidays'), { dates: updated });
    setHolidays(updated);
  };

  const dayIndex = new Date(`${selectedDate}T00:00:00`).getDay();

  const slotsByCourt = useMemo(
    () =>
      courts.map((court) => ({
        ...court,
        hours: getHours((schedules[court.id] || DEFAULT_SCHEDULE)[dayIndex])
      })),
    [courts, schedules, dayIndex]
  );

  return (
    <div className="app">
      <header className="hero">
        <img src={logo} alt="Logo La Única" className="logo" />
        <div>
          <h1>La Única - Sistema de Turnos</h1>
          <p>Reservá tu cancha de fútbol en segundos y administrá horarios, feriados y disponibilidad.</p>
        </div>
      </header>

      <img src={complejo} alt="Complejo La Única" className="banner" />

      <main className="content-grid">
        <section className="card">
          <h2>Disponibilidad</h2>
          <label>
            Día
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
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
                        disabled={Boolean(booked)}
                        className={booked ? 'slot slot-booked' : 'slot slot-open'}
                        onClick={() => bookSlot(court.id, hour)}
                      >
                        {hour}:00 {booked ? '· Reservado' : '· Disponible'}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
        </section>

        <section className="card">
          <h2>Cuenta</h2>
          {user ? (
            <div>
              <p>
                Sesión iniciada como <strong>{profile ? `${profile.firstName} ${profile.lastName}` : user.email}</strong>
              </p>
              <button type="button" onClick={logoutUser}>
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="auth-grid">
              <form onSubmit={loginUser}>
                <h3>Ingresar</h3>
                <input
                  type="email"
                  placeholder="Email"
                  value={loginData.email}
                  onChange={(event) => setLoginData((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={loginData.password}
                  onChange={(event) => setLoginData((prev) => ({ ...prev, password: event.target.value }))}
                  required
                />
                <button type="submit">Ingresar</button>
              </form>

              <form onSubmit={registerUser}>
                <h3>Registro</h3>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={registerData.firstName}
                  onChange={(event) => setRegisterData((prev) => ({ ...prev, firstName: event.target.value }))}
                  required
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={registerData.lastName}
                  onChange={(event) => setRegisterData((prev) => ({ ...prev, lastName: event.target.value }))}
                  required
                />
                <input
                  type="tel"
                  placeholder="Celular"
                  value={registerData.phone}
                  onChange={(event) => setRegisterData((prev) => ({ ...prev, phone: event.target.value }))}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={registerData.email}
                  onChange={(event) => setRegisterData((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={registerData.password}
                  onChange={(event) => setRegisterData((prev) => ({ ...prev, password: event.target.value }))}
                  required
                />
                <button type="submit">Crear cuenta</button>
              </form>
            </div>
          )}
          {authError && <p className="error">{authError}</p>}
        </section>

        <section className="card admin-card">
          <h2>Administración de canchas y horarios</h2>
          <form onSubmit={addCourt} className="inline-form">
            <input
              type="text"
              placeholder="Nombre de la nueva cancha"
              value={newCourtName}
              onChange={(event) => setNewCourtName(event.target.value)}
            />
            <button type="submit">Agregar cancha</button>
          </form>

          {courts.map((court) => (
            <article key={`${court.id}-admin`} className="admin-court">
              <div className="admin-court-header">
                <h3>{court.name}</h3>
                <button type="button" onClick={() => removeCourt(court.id)}>
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
                        onChange={(event) => saveScheduleHour(court.id, day, 'open', event.target.value)}
                      />
                    </label>
                    <label>
                      Hasta
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={schedule.close}
                        onChange={(event) => saveScheduleHour(court.id, day, 'close', event.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="card">
          <h2>Feriados</h2>
          <form onSubmit={addHoliday} className="inline-form">
            <input type="date" value={newHoliday} onChange={(event) => setNewHoliday(event.target.value)} />
            <button type="submit">Agregar feriado</button>
          </form>
          <ul>
            {holidays.map((holiday) => (
              <li key={holiday}>
                {holiday}
                <button type="button" onClick={() => removeHoliday(holiday)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {statusMessage && <p className="status">{statusMessage}</p>}
    </div>
  );
}

export default App;
