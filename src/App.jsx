import { useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithRedirect,
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
import { DEFAULT_SCHEDULE, emptyLogin, emptyRegister } from './constants';
import { buildUpcomingDates, isPastSlotInArgentina, toLocalDate } from './utils/date';
import Header from './components/Header';
import MainNav from './components/MainNav';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';
import MyBookingsPage from './pages/MyBookingsPage';

const googleProvider = new GoogleAuthProvider();

const getHours = (scheduleForDay) => {
  if (!scheduleForDay) return [];
  const { open, close } = scheduleForDay;
  if (open >= close) return [];
  return Array.from({ length: close - open }, (_, idx) => open + idx);
};

const buildPhone = ({ countryCode, areaCode, phoneNumber }) =>
  `+${countryCode.trim()} ${areaCode.trim()} ${phoneNumber.trim()}`.replace(/\s+/g, ' ').trim();

const isProfileComplete = (profile) => Boolean(profile?.firstName && profile?.lastName && profile?.phone);

const buildConfirmationToken = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function App() {
  const upcomingDates = useMemo(() => buildUpcomingDates(7), []);
  const [activeSection, setActiveSection] = useState('landing');
  const [authView, setAuthView] = useState('login');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [courts, setCourts] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [bookingsByCourtHour, setBookingsByCourtHour] = useState({});
  const [adminBookings, setAdminBookings] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = toLocalDate(new Date());
    return upcomingDates.includes(today) ? today : upcomingDates[0];
  });
  const [authError, setAuthError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loginData, setLoginData] = useState(emptyLogin);
  const [registerData, setRegisterData] = useState(emptyRegister);
  const [newCourtName, setNewCourtName] = useState('');
  const [newHoliday, setNewHoliday] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [selectedRoleUser, setSelectedRoleUser] = useState(null);

  const loadMyBookings = async (uid) => {
    if (!uid) {
      setMyBookings([]);
      return;
    }

    const bookingsSnapshot = await getDocs(query(collection(db, 'bookings'), where('userId', '==', uid)));
    const bookings = bookingsSnapshot.docs
      .map((booking) => ({ id: booking.id, ...booking.data() }))
      .sort((a, b) => `${a.date}-${a.hour}`.localeCompare(`${b.date}-${b.hour}`));
    setMyBookings(bookings);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      setAuthLoading(false);

      if (!authUser) {
        setProfile(null);
        setMyBookings([]);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
          setProfile({
            firstName: authUser.displayName?.split(' ')[0] || '',
            lastName: authUser.displayName?.split(' ').slice(1).join(' ') || '',
            email: authUser.email || '',
            phone: ''
          });
        }
        await loadMyBookings(authUser.uid);
      } catch {
        setAuthError('Sesión iniciada, pero no se pudo leer tu perfil.');
      } finally {
        setLoading(false);
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

    const allBookingsSnapshot = await getDocs(collection(db, 'bookings'));
    const allBookings = allBookingsSnapshot.docs
      .map((booking) => ({ id: booking.id, ...booking.data() }))
      .sort((a, b) => `${a.date || ''}-${a.hour || 0}`.localeCompare(`${b.date || ''}-${b.hour || 0}`));
    setAdminBookings(allBookings);

    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersData = usersSnapshot.docs
      .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
      .filter((entry) => entry.email)
      .sort((a, b) => a.email.localeCompare(b.email));
    setAllUsers(usersData);
    setAdminUsers(usersData.filter((entry) => entry.isAdmin));
  };

  useEffect(() => {
    loadCoreData(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('confirmBooking');
    const token = params.get('token');

    if (!bookingId || !token) {
      setPendingConfirmation(null);
      return;
    }

    setPendingConfirmation({ bookingId, token });
  }, []);

  useEffect(() => {
    if (user && !isProfileComplete(profile)) {
      setActiveSection('registro');
      setAuthView('register');
    }
  }, [user, profile]);

  const goToAuth = (mode) => {
    setAuthView(mode);
    setActiveSection('registro');
  };

  const loginWithGoogle = async () => {
    if (authLoading) return;
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch {
      setAuthError('No se pudo iniciar sesión con Google.');
      setAuthLoading(false);
    }
  };

  const loginUser = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
      setLoginData(emptyLogin);
      setStatusMessage('Sesión iniciada.');
      setActiveSection('landing');
    } catch {
      setAuthError('No se pudo iniciar sesión. Verificá tus credenciales.');
    } finally {
      setAuthLoading(false);
    }
  };

  const registerUser = async (event) => {
    event.preventDefault();
    setAuthError('');

    if (!registerData.countryCode || !registerData.areaCode || !registerData.phoneNumber) {
      setAuthError('Completá código de país, código de área y número de teléfono.');
      return;
    }

    try {
      const credentials = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);
      const payload = {
        firstName: registerData.firstName.trim(),
        lastName: registerData.lastName.trim(),
        phone: buildPhone(registerData),
        email: registerData.email.trim()
      };

      await setDoc(doc(db, 'users', credentials.user.uid), payload, { merge: true });
      setProfile(payload);
      setRegisterData(emptyRegister);
      setStatusMessage('Cuenta creada correctamente.');
      setActiveSection('landing');
    } catch {
      setAuthError('No se pudo registrar la cuenta.');
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!user) return;

    setAuthError('');
    if (!registerData.countryCode || !registerData.areaCode || !registerData.phoneNumber) {
      setAuthError('Completá código de país, código de área y número de teléfono.');
      return;
    }

    try {
      const payload = {
        firstName: registerData.firstName.trim(),
        lastName: registerData.lastName.trim(),
        phone: buildPhone(registerData),
        email: user.email || profile?.email || ''
      };
      await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
      setProfile(payload);
      setRegisterData(emptyRegister);
      setStatusMessage('Perfil guardado. Ya podés reservar tu turno.');
      setActiveSection('landing');
    } catch {
      setAuthError('No se pudo guardar tu perfil.');
    }
  };

  const logoutUser = async () => {
    await signOut(auth);
    setStatusMessage('Sesión cerrada.');
  };

  const bookSlot = async (courtId, hour) => {
    if (!user || !isProfileComplete(profile)) {
      setStatusMessage('Necesitás iniciar sesión y completar tus datos para reservar.');
      goToAuth(user ? 'register' : 'login');
      return;
    }

    const slotKey = `${courtId}-${hour}`;
    if (bookingsByCourtHour[slotKey]) return;

    if (isPastSlotInArgentina(selectedDate, hour)) {
      setStatusMessage('Ese horario ya pasó según la hora de Argentina (GMT-3).');
      return;
    }

    const alreadyBookedInDate = Object.values(bookingsByCourtHour).some((booking) => booking.userId === user.uid);
    if (alreadyBookedInDate) {
      setStatusMessage('Solo podés reservar un turno por día. Cancelá tu reserva actual para tomar otro horario.');
      setActiveSection('mis-reservas');
      return;
    }

    await addDoc(collection(db, 'bookings'), {
      courtId,
      hour,
      date: selectedDate,
      userId: user.uid,
      userName: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
      userPhone: profile?.phone || '',
      status: 'reservado',
      confirmationToken: buildConfirmationToken(),
      createdAt: serverTimestamp()
    });

    setStatusMessage(`Turno reservado para las ${hour}:00.`);
    await Promise.all([loadCoreData(selectedDate), loadMyBookings(user.uid)]);
  };

  const cancelBooking = async (bookingId) => {
    await deleteDoc(doc(db, 'bookings', bookingId));
    setStatusMessage('Reserva cancelada correctamente.');
    await Promise.all([loadCoreData(selectedDate), loadMyBookings(user?.uid)]);
  };

  const cancelBookingFromAdmin = async (bookingId) => {
    await deleteDoc(doc(db, 'bookings', bookingId));
    setStatusMessage('Turno cancelado desde administración.');
    await Promise.all([loadCoreData(selectedDate), loadMyBookings(user?.uid)]);
  };

  const makeAdministrator = async (uid) => {
    await setDoc(doc(db, 'users', uid), { isAdmin: true }, { merge: true });
    setStatusMessage('Usuario actualizado como administrador.');
    setSelectedRoleUser(null);
    setRoleSearch('');
    await loadCoreData(selectedDate);
  };

  const removeAdministrator = async (uid) => {
    await setDoc(doc(db, 'users', uid), { isAdmin: false }, { merge: true });
    setStatusMessage('Permiso de administrador removido.');
    await loadCoreData(selectedDate);
  };

  const respondBookingConfirmation = async (willAttend) => {
    if (!pendingConfirmation || confirmationLoading) return;

    setConfirmationLoading(true);
    try {
      const bookingRef = doc(db, 'bookings', pendingConfirmation.bookingId);
      const bookingDoc = await getDoc(bookingRef);

      if (!bookingDoc.exists()) {
        setStatusMessage('El turno no existe o ya fue eliminado.');
        return;
      }

      const bookingData = bookingDoc.data();
      const expectedToken = bookingData.confirmationToken || pendingConfirmation.bookingId;
      if (expectedToken !== pendingConfirmation.token) {
        setStatusMessage('El enlace de confirmación no es válido.');
        return;
      }

      if (willAttend) {
        if (bookingData.status !== 'confirmado') {
          await setDoc(bookingRef, { status: 'confirmado', confirmedAt: serverTimestamp() }, { merge: true });
          setStatusMessage('¡Gracias! Confirmaste tu asistencia al turno.');
        } else {
          setStatusMessage('Este turno ya estaba confirmado.');
        }
      } else {
        await deleteDoc(bookingRef);
        setStatusMessage('Liberaste el turno correctamente para otra persona.');
      }

      await loadCoreData(selectedDate);
      if (user?.uid) await loadMyBookings(user.uid);
      setPendingConfirmation(null);
      window.history.replaceState({}, '', window.location.pathname);
    } catch {
      setStatusMessage('No se pudo procesar la confirmación del turno.');
    } finally {
      setConfirmationLoading(false);
    }
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
        hours: getHours((schedules[court.id] || DEFAULT_SCHEDULE)[dayIndex]).filter((hour) => !isPastSlotInArgentina(selectedDate, hour))
      })),
    [courts, schedules, dayIndex, selectedDate]
  );

  const roleSuggestions = useMemo(() => {
    const normalizedSearch = roleSearch.trim().toLowerCase();
    if (!normalizedSearch) return [];

    return allUsers
      .filter((entry) => entry.email.toLowerCase().includes(normalizedSearch))
      .slice(0, 8);
  }, [allUsers, roleSearch]);

  const profileDraft = {
    firstName: registerData.firstName || profile?.firstName || '',
    lastName: registerData.lastName || profile?.lastName || '',
    countryCode: registerData.countryCode,
    areaCode: registerData.areaCode,
    phoneNumber: registerData.phoneNumber
  };

  return (
    <div className="app">
      <Header />
      <MainNav activeSection={activeSection} onChangeSection={setActiveSection} />

      <main>
        {loading ? (
          <section className="card">
            <p>Cargando datos...</p>
          </section>
        ) : null}

        {!loading && pendingConfirmation && (
          <section className="card confirmation-card">
            <h3>¿Confirmás la asistencia a tu turno?</h3>
            <p>Elegí una opción para continuar con tu reserva.</p>
            <div className="confirmation-actions">
              <button type="button" disabled={confirmationLoading} onClick={() => respondBookingConfirmation(true)}>
                Sí, voy a ir
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={confirmationLoading}
                onClick={() => respondBookingConfirmation(false)}
              >
                No, libero el turno para alguien más
              </button>
            </div>
          </section>
        )}

        {!loading && activeSection === 'landing' && (
          <LandingPage
            user={user}
            selectedDate={selectedDate}
            upcomingDates={upcomingDates}
            holidays={holidays}
            slotsByCourt={slotsByCourt}
            bookingsByCourtHour={bookingsByCourtHour}
            onChangeDate={setSelectedDate}
            onBookSlot={bookSlot}
            onGoLogin={() => goToAuth('login')}
            onGoRegister={() => goToAuth('register')}
          />
        )}

        {!loading && activeSection === 'mis-reservas' && (
          <MyBookingsPage
            user={user}
            bookings={myBookings}
            courts={courts}
            onCancelBooking={cancelBooking}
            onGoLogin={() => goToAuth('login')}
          />
        )}

        {!loading && activeSection === 'registro' && (
          <AuthPage
            user={user}
            profile={profile}
            profileDraft={profileDraft}
            authView={authView}
            authError={authError}
            authLoading={authLoading}
            loginData={loginData}
            registerData={registerData}
            onChangeAuthView={setAuthView}
            onChangeLogin={(field, value) => setLoginData((prev) => ({ ...prev, [field]: value }))}
            onChangeRegister={(field, value) => setRegisterData((prev) => ({ ...prev, [field]: value }))}
            onChangeProfileDraft={(field, value) => setRegisterData((prev) => ({ ...prev, [field]: value }))}
            onLogin={loginUser}
            onRegister={registerUser}
            onGoogleLogin={loginWithGoogle}
            onSaveProfile={saveProfile}
            onLogout={logoutUser}
            profileComplete={isProfileComplete(profile)}
          />
        )}

        {!loading && activeSection === 'admin' && (
          <AdminPage
            courts={courts}
            schedules={schedules}
            holidays={holidays}
            newCourtName={newCourtName}
            newHoliday={newHoliday}
            onChangeNewCourt={setNewCourtName}
            onChangeNewHoliday={setNewHoliday}
            onAddCourt={addCourt}
            onRemoveCourt={removeCourt}
            onSaveScheduleHour={saveScheduleHour}
            onAddHoliday={addHoliday}
            onRemoveHoliday={removeHoliday}
            adminBookings={adminBookings}
            onCancelBooking={cancelBookingFromAdmin}
            roleSearch={roleSearch}
            onChangeRoleSearch={setRoleSearch}
            selectedRoleUser={selectedRoleUser}
            onSelectRoleUser={setSelectedRoleUser}
            onClearRoleSelection={() => {
              setSelectedRoleUser(null);
              setRoleSearch('');
            }}
            roleSuggestions={roleSuggestions}
            adminUsers={adminUsers}
            onMakeAdmin={makeAdministrator}
            onRemoveAdmin={removeAdministrator}
          />
        )}
      </main>

      {statusMessage && <p className="status">{statusMessage}</p>}
    </div>
  );
}

export default App;
