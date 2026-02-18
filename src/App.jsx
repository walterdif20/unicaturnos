import { useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
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
import { DEFAULT_SCHEDULE, emptyRegister } from './constants';
import { buildUpcomingDates, toLocalDate } from './utils/date';
import Header from './components/Header';
import MainNav from './components/MainNav';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';

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

const getGoogleAuthErrorMessage = (error) => {
  if (!error?.code) return 'No se pudo iniciar sesión con Google. Intentá nuevamente.';

  switch (error.code) {
    case 'auth/configuration-not-found':
      return 'Google Sign-In no está configurado en Firebase. Activá el proveedor Google en Authentication > Sign-in method.';
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase Auth. Agregalo en Authentication > Settings > Authorized domains.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana emergente. Habilitá popups o intentá nuevamente.';
    case 'auth/popup-closed-by-user':
      return 'Se cerró la ventana de Google antes de completar el acceso.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'El entorno actual no soporta popup. Probá desde el navegador principal o usá redirección.';
    default:
      return 'No se pudo iniciar sesión con Google. Verificá la configuración de Firebase e intentá nuevamente.';
  }
};

function App() {
  const upcomingDates = useMemo(() => buildUpcomingDates(7), []);
  const [activeSection, setActiveSection] = useState('landing');
  const [authView, setAuthView] = useState('login');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoadingState] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [courts, setCourts] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [bookingsByCourtHour, setBookingsByCourtHour] = useState({});
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = toLocalDate(new Date());
    return upcomingDates.includes(today) ? today : upcomingDates[0];
  });
  const [authError, setAuthError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [registerData, setRegisterData] = useState(emptyRegister);
  const [newCourtName, setNewCourtName] = useState('');
  const [newHoliday, setNewHoliday] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (!authUser) {
        setProfile(null);
        setLoading(false);
        setAuthLoadingState(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userRef);
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
      } catch {
        setProfile({
          firstName: authUser.displayName?.split(' ')[0] || '',
          lastName: authUser.displayName?.split(' ').slice(1).join(' ') || '',
          email: authUser.email || '',
          phone: ''
        });
        setAuthError('Sesión iniciada, pero no se pudo leer tu perfil de Firestore. Revisá reglas/permisos.');
      } finally {
        setLoading(false);
        setAuthLoadingState(false);
      }
      setLoading(false);
      setAuthLoadingState(false);
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

  useEffect(() => {
    if (user && !isProfileComplete(profile)) {
      setActiveSection('registro');
      setAuthView('register');
    }
  }, [user, profile]);

  const loginWithGoogle = async () => {
    if (authLoading) return;

    setAuthError('');
    setAuthLoadingState(true);

    try {
      setStatusMessage('Redirigiendo a Google para iniciar sesión... Si volvés y seguís en esta pantalla, revisá dominios autorizados en Firebase Auth.');
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      setAuthError(getGoogleAuthErrorMessage(error));
      setAuthLoadingState(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!user) return;

    setAuthError('');
    const formattedPhone = buildPhone(registerData);
    if (!registerData.countryCode || !registerData.areaCode || !registerData.phoneNumber) {
      setAuthError('Completá código de país, código de área y número de teléfono.');
      return;
    }

    try {
      const payload = {
        firstName: registerData.firstName.trim(),
        lastName: registerData.lastName.trim(),
        phone: formattedPhone,
        email: user.email || profile?.email || ''
      };
      await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
      setProfile(payload);
      setStatusMessage('Perfil guardado. Ya podés reservar tu turno.');
      setRegisterData(emptyRegister);
    } catch {
      setAuthError('No se pudo guardar tu perfil.');
    }
  };

  const logoutUser = async () => {
    await signOut(auth);
    setStatusMessage('Sesión cerrada.');
  };

  const goToAuth = (mode) => {
    setAuthView(mode);
    setActiveSection('registro');
  };

  const bookSlot = async (courtId, hour) => {
    if (!user || !isProfileComplete(profile)) {
      setStatusMessage('Necesitás iniciar sesión con Google y completar tus datos para reservar.');
      goToAuth('register');
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

        {!loading && activeSection === 'registro' && (
          <AuthPage
            user={user}
            profile={profile}
            profileDraft={profileDraft}
            authView={authView}
            authError={authError}
            onChangeAuthView={setAuthView}
            onChangeProfileDraft={(field, value) => setRegisterData((prev) => ({ ...prev, [field]: value }))}
            onLoginWithGoogle={loginWithGoogle}
            onSaveProfile={saveProfile}
            onLogout={logoutUser}
            profileComplete={isProfileComplete(profile)}
            authLoading={authLoading}
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
          />
        )}
      </main>

      {statusMessage && <p className="status">{statusMessage}</p>}
    </div>
  );
}

export default App;
