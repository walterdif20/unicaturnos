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
  runTransaction,
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

const parsePhone = (phone = '') => {
  const normalizedPhone = phone.trim().replace(/\s+/g, ' ');
  const parts = normalizedPhone.split(' ').filter(Boolean);

  if (parts.length >= 3) {
    const [countryCodeRaw, areaCodeRaw, ...phoneNumberParts] = parts;
    return {
      countryCode: countryCodeRaw.replace(/\D/g, ''),
      areaCode: areaCodeRaw.replace(/\D/g, ''),
      phoneNumber: phoneNumberParts.join('').replace(/\D/g, '')
    };
  }

  return {
    countryCode: '',
    areaCode: '',
    phoneNumber: normalizedPhone.replace(/\D/g, '')
  };
};

const isProfileComplete = (profile) => Boolean(profile?.firstName && profile?.lastName && profile?.phone);

const buildConfirmationToken = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const emptyManualBooking = {
  date: '',
  courtId: '',
  hour: '',
  firstName: '',
  lastName: '',
  phone: ''
};

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
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [manualBookingData, setManualBookingData] = useState(emptyManualBooking);
  const canAccessAdmin = Boolean(user && profile?.isAdmin);

  const requestConfirmation = (message) => {
    if (typeof window === 'undefined') return true;
    return window.confirm(message);
  };

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

  useEffect(() => {
    if (!canAccessAdmin && activeSection === 'admin') {
      setActiveSection('landing');
    }
  }, [activeSection, canAccessAdmin]);

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
      setEditingProfile(false);
      setStatusMessage('Perfil guardado. Ya podés reservar tu turno.');
      setActiveSection('landing');
    } catch {
      setAuthError('No se pudo guardar tu perfil.');
    }
  };

  const logoutUser = async () => {
    if (!requestConfirmation('¿Estás seguro de que querés cerrar sesión?')) return;
    await signOut(auth);
    setStatusMessage('Sesión cerrada.');
  };

  const startEditingProfile = () => {
    const parsedPhone = parsePhone(profile?.phone || '');
    setRegisterData((prev) => ({
      ...prev,
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      countryCode: parsedPhone.countryCode,
      areaCode: parsedPhone.areaCode,
      phoneNumber: parsedPhone.phoneNumber
    }));
    setAuthError('');
    setEditingProfile(true);
  };

  const cancelEditingProfile = () => {
    setRegisterData(emptyRegister);
    setAuthError('');
    setEditingProfile(false);
  };

  const bookSlot = async (courtId, hour) => {
    if (bookingInProgress) return;

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

    if (!requestConfirmation(`¿Estás seguro de que querés reservar el turno de las ${hour}:00?`)) return;

    setBookingInProgress(true);
    try {
      await runTransaction(db, async (transaction) => {
        const bookingId = `${selectedDate}_${courtId}_${hour}`;
        const bookingRef = doc(db, 'bookings', bookingId);
        const existingBooking = await transaction.get(bookingRef);

        if (existingBooking.exists()) {
          throw new Error('SLOT_ALREADY_BOOKED');
        }

        transaction.set(bookingRef, {
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
      });

      setStatusMessage(`Turno reservado para las ${hour}:00.`);
      await Promise.all([loadCoreData(selectedDate), loadMyBookings(user.uid)]);
    } catch (error) {
      if (error instanceof Error && error.message === 'SLOT_ALREADY_BOOKED') {
        setStatusMessage('Ese turno ya fue reservado por otra persona. Elegí otro horario.');
      } else {
        setStatusMessage('No se pudo reservar el turno. Intentá nuevamente.');
      }
      await loadCoreData(selectedDate);
    } finally {
      setBookingInProgress(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    if (!requestConfirmation('¿Estás seguro de que querés cancelar esta reserva?')) return;
    await deleteDoc(doc(db, 'bookings', bookingId));
    setStatusMessage('Reserva cancelada correctamente.');
    await Promise.all([loadCoreData(selectedDate), loadMyBookings(user?.uid)]);
  };

  const cancelBookingFromAdmin = async (bookingId) => {
    if (!requestConfirmation('¿Estás seguro de que querés cancelar este turno?')) return;
    await deleteDoc(doc(db, 'bookings', bookingId));
    setStatusMessage('Turno cancelado desde administración.');
    await Promise.all([loadCoreData(selectedDate), loadMyBookings(user?.uid)]);
  };

  const makeAdministrator = async (uid) => {
    if (!requestConfirmation('¿Estás seguro de que querés otorgar permisos de administrador?')) return;
    await setDoc(doc(db, 'users', uid), { isAdmin: true }, { merge: true });
    setStatusMessage('Usuario actualizado como administrador.');
    setSelectedRoleUser(null);
    setRoleSearch('');
    await loadCoreData(selectedDate);
  };

  const removeAdministrator = async (uid) => {
    if (!requestConfirmation('¿Estás seguro de que querés quitar los permisos de administrador?')) return;
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
        if (!requestConfirmation('¿Estás seguro de que querés confirmar tu asistencia?')) return;
        if (bookingData.status !== 'confirmado') {
          await setDoc(bookingRef, { status: 'confirmado', confirmedAt: serverTimestamp() }, { merge: true });
          setStatusMessage('¡Gracias! Confirmaste tu asistencia al turno.');
        } else {
          setStatusMessage('Este turno ya estaba confirmado.');
        }
      } else {
        if (!requestConfirmation('¿Estás seguro de que querés liberar este turno?')) return;
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
    if (!requestConfirmation('¿Estás seguro de que querés agregar esta cancha?')) return;
    const created = await addDoc(collection(db, 'courts'), { name: newCourtName.trim() });
    await setDoc(doc(db, 'schedules', created.id), DEFAULT_SCHEDULE);
    setNewCourtName('');
    setStatusMessage('Cancha agregada correctamente.');
    await loadCoreData(selectedDate);
  };

  const removeCourt = async (courtId) => {
    if (!requestConfirmation('¿Estás seguro de que querés eliminar esta cancha?')) return;
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
    if (!requestConfirmation('¿Estás seguro de que querés agregar este feriado?')) return;
    const updated = [...holidays, newHoliday].sort();
    await setDoc(doc(db, 'settings', 'holidays'), { dates: updated });
    setHolidays(updated);
    setNewHoliday('');
  };

  const removeHoliday = async (date) => {
    if (!requestConfirmation('¿Estás seguro de que querés quitar este feriado?')) return;
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

  const adminBookableDates = useMemo(
    () => upcomingDates.filter((date) => !holidays.includes(date)),
    [upcomingDates, holidays]
  );

  const manualBookingAvailability = useMemo(() => {
    if (!manualBookingData.date) {
      return { courts: [], hoursByCourt: {} };
    }

    const occupiedSlots = new Set(
      adminBookings
        .filter((booking) => booking.date === manualBookingData.date)
        .map((booking) => `${booking.courtId}-${booking.hour}`)
    );

    const dayIndexForManual = new Date(`${manualBookingData.date}T00:00:00`).getDay();
    const hoursByCourt = {};

    courts.forEach((court) => {
      const daySchedule = (schedules[court.id] || DEFAULT_SCHEDULE)[dayIndexForManual];
      const availableHours = getHours(daySchedule)
        .filter((hour) => !isPastSlotInArgentina(manualBookingData.date, hour))
        .filter((hour) => !occupiedSlots.has(`${court.id}-${hour}`));
      hoursByCourt[court.id] = availableHours;
    });

    return {
      courts: courts.filter((court) => (hoursByCourt[court.id] || []).length > 0),
      hoursByCourt
    };
  }, [adminBookings, courts, manualBookingData.date, schedules]);

  useEffect(() => {
    setManualBookingData((prev) => {
      const fallbackDate = adminBookableDates[0] || '';
      const validDate = prev.date && adminBookableDates.includes(prev.date) ? prev.date : fallbackDate;

      if (validDate !== prev.date) {
        return { ...prev, date: validDate, courtId: '', hour: '' };
      }
      return prev;
    });
  }, [adminBookableDates]);

  useEffect(() => {
    setManualBookingData((prev) => {
      const availableCourtIds = manualBookingAvailability.courts.map((court) => court.id);
      const validCourtId = availableCourtIds.includes(prev.courtId) ? prev.courtId : availableCourtIds[0] || '';
      const availableHours = manualBookingAvailability.hoursByCourt[validCourtId] || [];
      const hourAsNumber = Number(prev.hour);
      const validHour = availableHours.includes(hourAsNumber) ? String(hourAsNumber) : String(availableHours[0] ?? '');

      if (prev.courtId !== validCourtId || prev.hour !== validHour) {
        return {
          ...prev,
          courtId: validCourtId,
          hour: validHour
        };
      }

      return prev;
    });
  }, [manualBookingAvailability]);

  const createManualBooking = async (event) => {
    event.preventDefault();

    const firstName = manualBookingData.firstName.trim();
    const lastName = manualBookingData.lastName.trim();
    const phone = manualBookingData.phone.trim();

    if (!firstName || !lastName || !phone) {
      setStatusMessage('Completá nombre, apellido y teléfono para cargar el turno manual.');
      return;
    }

    if (!manualBookingData.date || !manualBookingData.courtId || manualBookingData.hour === '') {
      setStatusMessage('Seleccioná fecha, cancha y horario para registrar el turno manual.');
      return;
    }

    const selectedHour = Number(manualBookingData.hour);
    const validHours = manualBookingAvailability.hoursByCourt[manualBookingData.courtId] || [];
    if (!validHours.includes(selectedHour)) {
      setStatusMessage('El turno seleccionado ya no está disponible. Elegí otro horario.');
      await loadCoreData(selectedDate);
      return;
    }

    if (!requestConfirmation('¿Estás seguro de que querés cargar este turno manual?')) return;

    try {
      await runTransaction(db, async (transaction) => {
        const bookingId = `${manualBookingData.date}_${manualBookingData.courtId}_${selectedHour}`;
        const bookingRef = doc(db, 'bookings', bookingId);
        const existingBooking = await transaction.get(bookingRef);

        if (existingBooking.exists()) {
          throw new Error('SLOT_ALREADY_BOOKED');
        }

        transaction.set(bookingRef, {
          courtId: manualBookingData.courtId,
          hour: selectedHour,
          date: manualBookingData.date,
          userId: null,
          userName: `${firstName} ${lastName}`,
          userPhone: phone,
          status: 'reservado',
          bookedByAdmin: true,
          confirmationToken: buildConfirmationToken(),
          createdAt: serverTimestamp()
        });
      });

      setStatusMessage('Turno cargado manualmente con éxito.');
      setManualBookingData((prev) => ({ ...prev, firstName: '', lastName: '', phone: '' }));
      await loadCoreData(selectedDate);
    } catch (error) {
      if (error instanceof Error && error.message === 'SLOT_ALREADY_BOOKED') {
        setStatusMessage('Ese turno ya fue reservado por otra persona. Elegí otro horario.');
      } else {
        setStatusMessage('No se pudo cargar el turno manual. Intentá nuevamente.');
      }
      await loadCoreData(selectedDate);
    }
  };

  const parsedProfilePhone = parsePhone(profile?.phone || '');

  const profileDraft = {
    firstName: registerData.firstName || profile?.firstName || '',
    lastName: registerData.lastName || profile?.lastName || '',
    countryCode: registerData.countryCode || parsedProfilePhone.countryCode,
    areaCode: registerData.areaCode || parsedProfilePhone.areaCode,
    phoneNumber: registerData.phoneNumber || parsedProfilePhone.phoneNumber
  };

  return (
    <div className="app">
      <Header />
      <MainNav activeSection={activeSection} onChangeSection={setActiveSection} canAccessAdmin={canAccessAdmin} />

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
            bookingInProgress={bookingInProgress}
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
            onStartEditProfile={startEditingProfile}
            onCancelEditProfile={cancelEditingProfile}
            editingProfile={editingProfile}
            profileComplete={isProfileComplete(profile)}
          />
        )}

        {!loading && canAccessAdmin && activeSection === 'admin' && (
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
            manualBookingData={manualBookingData}
            onChangeManualBookingField={(field, value) =>
              setManualBookingData((prev) => ({ ...prev, [field]: value }))
            }
            onCreateManualBooking={createManualBooking}
            manualBookableDates={adminBookableDates}
            manualBookableCourts={manualBookingAvailability.courts}
            manualBookableHours={manualBookingAvailability.hoursByCourt[manualBookingData.courtId] || []}
          />
        )}
      </main>

      {statusMessage && <p className="status">{statusMessage}</p>}
    </div>
  );
}

export default App;
