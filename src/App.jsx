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
import { DEFAULT_SCHEDULE, emptyLogin, emptyRegister } from './constants';
import { buildUpcomingDates, toLocalDate } from './utils/date';
import Header from './components/Header';
import MainNav from './components/MainNav';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';

const getHours = (scheduleForDay) => {
  if (!scheduleForDay) return [];
  const { open, close } = scheduleForDay;
  if (open >= close) return [];
  return Array.from({ length: close - open }, (_, idx) => open + idx);
};

const buildPhone = ({ countryCode, areaCode, phoneNumber }) =>
  `+${countryCode.trim()} ${areaCode.trim()} ${phoneNumber.trim()}`.replace(/\s+/g, ' ').trim();

const isProfileComplete = (profile) => Boolean(profile?.firstName && profile?.lastName && profile?.phone);

function App() {
  const upcomingDates = useMemo(() => buildUpcomingDates(7), []);
  const [activeSection, setActiveSection] = useState('landing');
  const [authView, setAuthView] = useState('login');
  const [loading, setLoading] = useState(true);
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
  const [loginData, setLoginData] = useState(emptyLogin);
  const [newCourtName, setNewCourtName] = useState('');
  const [newHoliday, setNewHoliday] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (!authUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
          setProfile({
            firstName: '',
            lastName: '',
            email: authUser.email || '',
            phone: ''
          });
        }
      } catch {
        setProfile({
          firstName: '',
          lastName: '',
          email: authUser.email || '',
          phone: ''
        });
        setAuthError('Sesión iniciada, pero no se pudo leer tu perfil de Firestore. Revisá reglas/permisos.');
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

  const registerUser = async (event) => {
    event.preventDefault();
    setAuthError('');

    if (!registerData.countryCode || !registerData.areaCode || !registerData.phoneNumber) {
      setAuthError('Completá código de país, código de área y número de teléfono.');
      return;
    }

    try {
      const created = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);
      const payload = {
        firstName: registerData.firstName.trim(),
        lastName: registerData.lastName.trim(),
        phone: buildPhone(registerData),
        email: registerData.email.trim()
      };
      await setDoc(doc(db, 'users', created.user.uid), payload, { merge: true });
      setProfile(payload);
      setRegisterData(emptyRegister);
      setStatusMessage('Registro exitoso. Ya podés reservar tu turno.');
      setActiveSection('landing');
    } catch {
      setAuthError('No se pudo registrar. Revisá email/contraseña e intentá nuevamente.');
    }
  };

  const loginUser = async (event) => {
    event.preventDefault();
    setAuthError('');

    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
      setLoginData(emptyLogin);
      setStatusMessage('Sesión iniciada correctamente.');
      setActiveSection('landing');
    } catch {
      setAuthError('Credenciales inválidas.');
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

  const goToAuth = (mode) => {
    setAuthView(mode);
    setActiveSection('registro');
  };

  const bookSlot = async (courtId, hour) => {
    if (!user || !isProfileComplete(profile)) {
      setStatusMessage('Necesitás iniciar sesión y completar tus datos para reservar.');
      goToAuth(user ? 'register' : 'login');
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
            loginData={loginData}
            registerData={registerData}
            onChangeAuthView={setAuthView}
            onChangeLogin={(field, value) => setLoginData((prev) => ({ ...prev, [field]: value }))}
            onChangeRegister={(field, value) => setRegisterData((prev) => ({ ...prev, [field]: value }))}
            onChangeProfileDraft={(field, value) => setRegisterData((prev) => ({ ...prev, [field]: value }))}
            onLogin={loginUser}
            onRegister={registerUser}
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
          />
        )}
      </main>

      {statusMessage && <p className="status">{statusMessage}</p>}
    </div>
  );
}

export default App;
