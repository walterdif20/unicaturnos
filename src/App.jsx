import { useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
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
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { DEFAULT_SCHEDULE, emptyLogin, emptyRegister } from './constants';
import { buildUpcomingDates, isPastSlotInArgentina, isTooLateToCancelInArgentina, toLocalDate } from './utils/date';
import Header from './components/Header';
import MainNav from './components/MainNav';
import BookingPage from './pages/BookingPage';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';
import MyBookingsPage from './pages/MyBookingsPage';
import RaffleWinnersPage from './pages/RaffleWinnersPage';

const googleProvider = new GoogleAuthProvider();

const getHours = (scheduleForDay) => {
  if (!scheduleForDay) return [];
  const { open, close } = scheduleForDay;
  if (open >= close) return [];
  return Array.from({ length: close - open }, (_, idx) => open + idx);
};

const buildPhone = ({ countryCode, areaCode, phoneNumber }) =>
  `+${countryCode.trim()} ${areaCode.trim()} ${phoneNumber.trim()}`.replace(/\s+/g, ' ').trim();

const phoneAlreadyExists = async (phone) => {
  const duplicatedPhoneQuery = query(collection(db, 'users'), where('phone', '==', phone));
  const duplicatedPhoneSnapshot = await getDocs(duplicatedPhoneQuery);
  return !duplicatedPhoneSnapshot.empty;
};

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
    countryCode: '54',
    areaCode: '',
    phoneNumber: normalizedPhone.replace(/\D/g, '')
  };
};

const isProfileComplete = (profile) => Boolean(profile?.firstName && profile?.phone);
const isUserBlocked = (profile) => Boolean(profile?.isBlocked);

const buildConfirmationToken = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const splitFullName = (fullName = '') => {
  const normalized = fullName.trim().replace(/\s+/g, ' ');
  if (!normalized) return { firstName: '', lastName: '' };

  const [firstName, ...lastNameParts] = normalized.split(' ');
  return {
    firstName,
    lastName: lastNameParts.join(' ')
  };
};

const getFirebaseAuthErrorMessage = (error, fallbackMessage) => {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';

  if (errorCode === 'auth/configuration-not-found' || errorMessage.includes('CONFIGURATION_NOT_FOUND')) {
    return 'No se pudo conectar con Firebase Auth (CONFIGURATION_NOT_FOUND). Verificá que el API key pertenezca al proyecto activo y que Authentication esté habilitado en Firebase Console.';
  }

  if (errorCode === 'auth/invalid-api-key') {
    return 'El API key de Firebase es inválido. Revisá VITE_FIREBASE_API_KEY en tu .env.';
  }

  if (errorCode === 'auth/network-request-failed') {
    return 'No se pudo conectar con Firebase. Revisá tu conexión e intentá nuevamente.';
  }

  return fallbackMessage;
};

const emptyManualBooking = {
  date: '',
  courtId: '',
  hour: '',
  firstName: '',
  lastName: '',
  phone: ''
};

const DEFAULT_COURT_PRICE = 58800;
const FIXED_BOOKING_WEEKS_AHEAD = 4;
const ALLOWED_FIXED_BOOKING_STATUSES = ['active', 'paused', 'cancelled'];

const emptyRaffleDraft = {
  itemName: '',
  winnerId: '',
  winnerName: '',
  winnerPhone: ''
};

const formatRaffleDrawDate = (date = new Date()) =>
  new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'full',
    timeStyle: 'short'
  }).format(date);


const SECTION_HELP = {
  reservas: {
    title: 'Reservas',
    description: 'Elegí fecha y horario para reservar tu cancha en pocos pasos.'
  },
  ganadores: {
    title: 'Últimos ganadores',
    description: 'Consultá los resultados de los sorteos más recientes.'
  },
  'mis-reservas': {
    title: 'Mis reservas',
    description: 'Revisá, confirmá o cancelá tus turnos activos.'
  },
  registro: {
    title: 'Mi cuenta',
    description: 'Iniciá sesión, registrate o editá tus datos de perfil.'
  },
  admin: {
    title: 'Administración',
    description: 'Configurá canchas, horarios, feriados y usuarios.'
  }
};

const parseCourtPrice = (value) => {
  const normalizedValue = Number(value);
  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) return DEFAULT_COURT_PRICE;
  return Math.round(normalizedValue);
};

function App() {
  const upcomingDates = useMemo(() => buildUpcomingDates(7), []);
  const [activeSection, setActiveSection] = useState('reservas');
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
  const [fixedBookings, setFixedBookings] = useState([]);
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
  const [editingProfile, setEditingProfile] = useState(false);
  const [courtPrice, setCourtPrice] = useState(DEFAULT_COURT_PRICE);
  const [newCourtPrice, setNewCourtPrice] = useState(String(DEFAULT_COURT_PRICE));
  const [raffleDraft, setRaffleDraft] = useState(emptyRaffleDraft);
  const [raffleWinners, setRaffleWinners] = useState([]);
  const [raffleAnimating, setRaffleAnimating] = useState(false);
  const canAccessAdmin = Boolean(profile?.isAdmin);

  const visibleMyBookings = useMemo(
    () => myBookings.filter((booking) => !isPastSlotInArgentina(booking.date, booking.hour)),
    [myBookings]
  );

  const visibleMyFixedBookings = useMemo(
    () => fixedBookings.filter((entry) => entry.userId === user?.uid && entry.status !== 'cancelled'),
    [fixedBookings, user?.uid]
  );

  const visibleAdminFixedBookings = useMemo(
    () => fixedBookings.filter((entry) => entry.status !== 'cancelled'),
    [fixedBookings]
  );

  const requestConfirmation = (message) => {
    if (typeof window === 'undefined') return true;
    return window.confirm(message);
  };

  const isValidFixedBookingId = (fixedBookingId) => typeof fixedBookingId === 'string' && fixedBookingId.trim().length > 0;

  const mapBookings = (snapshot) =>
    snapshot.docs
      .map((booking) => ({ id: booking.id, ...booking.data() }))
      .sort((a, b) => `${a.date || ''}-${a.hour || 0}`.localeCompare(`${b.date || ''}-${b.hour || 0}`));

  const mapFixedBookings = (snapshot) =>
    snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => `${a.weekday || 0}-${a.hour || 0}`.localeCompare(`${b.weekday || 0}-${b.hour || 0}`));

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

  const loadFixedBookings = async (uid, isAdminView = false) => {
    if (!uid && !isAdminView) {
      setFixedBookings([]);
      return;
    }

    const fixedBookingsQuery = isAdminView
      ? collection(db, 'fixedBookings')
      : query(collection(db, 'fixedBookings'), where('userId', '==', uid));

    const fixedBookingsSnapshot = await getDocs(fixedBookingsQuery);
    const fixedData = fixedBookingsSnapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => `${a.weekday || 0}-${a.hour || 0}`.localeCompare(`${b.weekday || 0}-${b.hour || 0}`));

    setFixedBookings(fixedData);
  };

  const ensureFixedBookingOccurrences = async (fixedBooking) => {
    if (!fixedBooking || fixedBooking.status !== 'active') return;

    const startDate = new Date(`${fixedBooking.startDate}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let weekOffset = 0; weekOffset < FIXED_BOOKING_WEEKS_AHEAD; weekOffset += 1) {
      const occurrenceDate = new Date(today);
      occurrenceDate.setDate(today.getDate() + weekOffset * 7);

      const dayDifference = (fixedBooking.weekday - occurrenceDate.getDay() + 7) % 7;
      occurrenceDate.setDate(occurrenceDate.getDate() + dayDifference);

      if (occurrenceDate < startDate) continue;

      const isoDate = toLocalDate(occurrenceDate);
      if (fixedBooking.endDate && isoDate > fixedBooking.endDate) continue;
      if (isPastSlotInArgentina(isoDate, fixedBooking.hour)) continue;

      const bookingId = `${isoDate}_${fixedBooking.courtId}_${fixedBooking.hour}`;
      const bookingRef = doc(db, 'bookings', bookingId);
      const existingBooking = await getDoc(bookingRef);
      if (existingBooking.exists()) continue;

      await setDoc(bookingRef, {
        courtId: fixedBooking.courtId,
        hour: fixedBooking.hour,
        date: isoDate,
        userId: fixedBooking.userId,
        userName: fixedBooking.userName,
        userPhone: fixedBooking.userPhone,
        status: 'reservado',
        source: 'fixed',
        fixedId: fixedBooking.id,
        confirmationToken: buildConfirmationToken(),
        createdAt: serverTimestamp()
      });
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      setAuthLoading(false);

      if (!authUser) {
        setProfile(null);
        setMyBookings([]);
        setFixedBookings([]);
        setEditingProfile(false);
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
        await loadFixedBookings(authUser.uid, Boolean(userDoc.data()?.isAdmin));
      } catch {
        setAuthError('Sesión iniciada, pero no se pudo leer tu perfil.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribeCourts = onSnapshot(collection(db, 'courts'), (snapshot) => {
      const courtsData = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setCourts(courtsData);
    });

    const unsubscribeSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const scheduleEntries = {};
      snapshot.docs.forEach((scheduleDoc) => {
        scheduleEntries[scheduleDoc.id] = scheduleDoc.data();
      });
      setSchedules((previous) => {
        const mergedSchedules = { ...previous, ...scheduleEntries };
        courts.forEach((court) => {
          if (!mergedSchedules[court.id]) {
            mergedSchedules[court.id] = DEFAULT_SCHEDULE;
          }
        });
        return mergedSchedules;
      });
    });

    const unsubscribeHolidays = onSnapshot(doc(db, 'settings', 'holidays'), (holidayDoc) => {
      const holidayDates = holidayDoc.exists() ? holidayDoc.data().dates || [] : [];
      setHolidays(holidayDates);
    });

    const unsubscribePricing = onSnapshot(doc(db, 'settings', 'pricing'), (pricingDoc) => {
      const savedCourtPrice = pricingDoc.exists() ? parseCourtPrice(pricingDoc.data().courtPrice) : DEFAULT_COURT_PRICE;
      setCourtPrice(savedCourtPrice);
      setNewCourtPrice(String(savedCourtPrice));
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (usersSnapshot) => {
      const usersData = usersSnapshot.docs
        .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
        .filter((entry) => entry.email)
        .sort((a, b) => a.email.localeCompare(b.email));

      setAllUsers(usersData);
      setAdminUsers(usersData.filter((entry) => entry.isAdmin));
    });

    const unsubscribeRaffles = onSnapshot(collection(db, 'raffleHistory'), (rafflesSnapshot) => {
      const rafflesData = rafflesSnapshot.docs
        .map((raffleDoc) => ({ id: raffleDoc.id, ...raffleDoc.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        })
        .slice(0, 12);
      setRaffleWinners(rafflesData);
    });

    return () => {
      unsubscribeCourts();
      unsubscribeSchedules();
      unsubscribeHolidays();
      unsubscribePricing();
      unsubscribeUsers();
      unsubscribeRaffles();
    };
  }, []);

  useEffect(() => {
    setSchedules((previous) => {
      const nextSchedules = { ...previous };
      let hasChanges = false;

      courts.forEach((court) => {
        if (!nextSchedules[court.id]) {
          nextSchedules[court.id] = DEFAULT_SCHEDULE;
          hasChanges = true;
        }
      });

      return hasChanges ? nextSchedules : previous;
    });
  }, [courts]);

  useEffect(() => {
    const unsubscribeDayBookings = onSnapshot(
      query(collection(db, 'bookings'), where('date', '==', selectedDate)),
      (bookingSnapshot) => {
        const bookedMap = {};
        bookingSnapshot.forEach((booking) => {
          const data = booking.data();
          bookedMap[`${data.courtId}-${data.hour}`] = { id: booking.id, ...data };
        });
        setBookingsByCourtHour(bookedMap);
      }
    );

    return () => unsubscribeDayBookings();
  }, [selectedDate]);

  useEffect(() => {
    const unsubscribeAdminBookings = onSnapshot(collection(db, 'bookings'), (allBookingsSnapshot) => {
      setAdminBookings(mapBookings(allBookingsSnapshot));
    });

    return () => unsubscribeAdminBookings();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setMyBookings([]);
      return undefined;
    }

    const unsubscribeMyBookings = onSnapshot(
      query(collection(db, 'bookings'), where('userId', '==', user.uid)),
      (bookingsSnapshot) => {
        setMyBookings(mapBookings(bookingsSnapshot));
      }
    );

    return () => unsubscribeMyBookings();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid && !canAccessAdmin) {
      setFixedBookings([]);
      return undefined;
    }

    const fixedBookingsQuery = canAccessAdmin
      ? collection(db, 'fixedBookings')
      : query(collection(db, 'fixedBookings'), where('userId', '==', user.uid));

    const unsubscribeFixedBookings = onSnapshot(fixedBookingsQuery, (fixedBookingsSnapshot) => {
      setFixedBookings(mapFixedBookings(fixedBookingsSnapshot));
    });

    return () => unsubscribeFixedBookings();
  }, [canAccessAdmin, user?.uid]);

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

    const pricingDoc = await getDoc(doc(db, 'settings', 'pricing'));
    const savedCourtPrice = pricingDoc.exists() ? parseCourtPrice(pricingDoc.data().courtPrice) : DEFAULT_COURT_PRICE;
    setCourtPrice(savedCourtPrice);
    setNewCourtPrice(String(savedCourtPrice));

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

    const rafflesSnapshot = await getDocs(collection(db, 'raffleHistory'));
    const rafflesData = rafflesSnapshot.docs
      .map((raffleDoc) => ({ id: raffleDoc.id, ...raffleDoc.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      })
      .slice(0, 12);
    setRaffleWinners(rafflesData);

    if (user?.uid) {
      await loadFixedBookings(user.uid, Boolean(usersData.find((entry) => entry.id === user.uid)?.isAdmin));
    }
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
      setActiveSection('reservas');
    }
  }, [activeSection, canAccessAdmin]);

  const goToAuth = (mode) => {
    setAuthView(mode);
    setEditingProfile(false);
    setActiveSection('registro');
  };

  const loginWithGoogle = async () => {
    if (authLoading) return;
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      setAuthError(getFirebaseAuthErrorMessage(error, 'No se pudo iniciar sesión con Google.'));
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
      setActiveSection('reservas');
    } catch (error) {
      setAuthError(getFirebaseAuthErrorMessage(error, 'No se pudo iniciar sesión. Verificá tus credenciales.'));
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

    setAuthLoading(true);

    try {
      const phone = buildPhone(registerData);
      const { firstName, lastName } = splitFullName(registerData.fullName);

      if (!firstName) {
        setAuthError('Completá tu nombre y apellido.');
        return;
      }

      if (await phoneAlreadyExists(phone)) {
        setAuthError('Ese teléfono ya está registrado. Usá otro número o iniciá sesión.');
        return;
      }

      const credentials = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone,
        email: registerData.email.trim()
      };

      await setDoc(doc(db, 'users', credentials.user.uid), payload, { merge: true });
      setProfile(payload);
      setRegisterData(emptyRegister);
      setStatusMessage('Cuenta creada correctamente.');
      setEditingProfile(false);
      setActiveSection('reservas');
    } catch (error) {
      setAuthError(getFirebaseAuthErrorMessage(error, 'No se pudo registrar la cuenta.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const recoverPassword = async () => {
    const email = loginData.email.trim();
    setAuthError('');
    setStatusMessage('');

    if (!email) {
      setAuthError('Ingresá tu correo para enviarte el link de recuperación.');
      return;
    }

    setAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setStatusMessage('Te enviamos un enlace para recuperar tu contraseña. Revisá tu correo.');
    } catch (error) {
      setAuthError(
        getFirebaseAuthErrorMessage(error, 'No se pudo enviar el correo de recuperación. Verificá el email e intentá de nuevo.')
      );
    } finally {
      setAuthLoading(false);
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

    setAuthLoading(true);

    try {
      const { firstName, lastName } = splitFullName(registerData.fullName);
      if (!firstName) {
        setAuthError('Completá tu nombre y apellido.');
        return;
      }

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: buildPhone(registerData),
        email: user.email || profile?.email || ''
      };
      await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
      setProfile(payload);
      setRegisterData(emptyRegister);
      setEditingProfile(false);
      setStatusMessage('Perfil guardado correctamente.');
    } catch {
      setAuthError('No se pudo guardar tu perfil.');
    } finally {
      setAuthLoading(false);
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
      fullName: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
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

    if (isUserBlocked(profile)) {
      setStatusMessage('Tu usuario está bloqueado para reservar turnos. Contactá a administración.');
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

  const cancelBooking = async (booking) => {
    if (!booking?.id) return;

    if (isTooLateToCancelInArgentina(booking.date, booking.hour)) {
      setStatusMessage('Es muy tarde para cancelar el turno.');
      return;
    }

    if (!requestConfirmation('¿Estás seguro de que querés cancelar esta reserva?')) return;
    await deleteDoc(doc(db, 'bookings', booking.id));
    setStatusMessage('Reserva cancelada correctamente.');
    await Promise.all([loadCoreData(selectedDate), loadMyBookings(user?.uid)]);
  };

  const createFixedBookingFromBooking = async (booking) => {
    if (!user || !booking?.id) return;

    if (booking.source === 'fixed' && booking.fixedId) {
      setStatusMessage('Este turno ya pertenece a un turno fijo.');
      return;
    }

    const weekday = new Date(`${booking.date}T00:00:00`).getDay();
    const existing = fixedBookings.find(
      (entry) =>
        entry.userId === user.uid &&
        entry.courtId === booking.courtId &&
        entry.hour === booking.hour &&
        entry.weekday === weekday &&
        entry.status !== 'cancelled'
    );

    if (existing) {
      setStatusMessage('Ya tenés un turno fijo activo o pausado para ese día y horario.');
      return;
    }

    if (!requestConfirmation('¿Querés convertir este turno en fijo semanal?')) return;

    const fixedRef = await addDoc(collection(db, 'fixedBookings'), {
      userId: user.uid,
      userName: booking.userName,
      userPhone: booking.userPhone,
      courtId: booking.courtId,
      weekday,
      hour: booking.hour,
      status: 'active',
      startDate: booking.date,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const fixedPayload = {
      id: fixedRef.id,
      userId: user.uid,
      userName: booking.userName,
      userPhone: booking.userPhone,
      courtId: booking.courtId,
      weekday,
      hour: booking.hour,
      status: 'active',
      startDate: booking.date
    };

    await setDoc(doc(db, 'bookings', booking.id), { source: 'fixed', fixedId: fixedRef.id }, { merge: true });
    await ensureFixedBookingOccurrences(fixedPayload);
    await loadCoreData(selectedDate);
    await loadMyBookings(user.uid);
    setStatusMessage('Turno fijo creado. Vamos a ir generando tus próximos turnos semanales.');
  };

  const updateFixedBookingStatus = async (fixedBookingId, nextStatus) => {
    if (!isValidFixedBookingId(fixedBookingId)) {
      setStatusMessage('No se pudo identificar el turno fijo a actualizar.');
      return;
    }
    if (!ALLOWED_FIXED_BOOKING_STATUSES.includes(nextStatus)) {
      setStatusMessage('Estado de turno fijo inválido.');
      return;
    }

    await setDoc(doc(db, 'fixedBookings', fixedBookingId), { status: nextStatus, updatedAt: serverTimestamp() }, { merge: true });

    if (nextStatus === 'active') {
      const updatedDoc = await getDoc(doc(db, 'fixedBookings', fixedBookingId));
      if (updatedDoc.exists()) {
        await ensureFixedBookingOccurrences({ id: fixedBookingId, ...updatedDoc.data() });
      }
    }

    await loadFixedBookings(user?.uid, canAccessAdmin);
    await loadCoreData(selectedDate);
    if (user?.uid) await loadMyBookings(user.uid);
  };

  const cancelFixedBooking = async (fixedBookingId) => {
    if (!isValidFixedBookingId(fixedBookingId)) {
      setStatusMessage('No se pudo identificar el turno fijo a cancelar.');
      return;
    }
    if (!requestConfirmation('¿Querés cancelar definitivamente este turno fijo?')) return;
    await setDoc(
      doc(db, 'fixedBookings', fixedBookingId),
      { status: 'cancelled', cancelledBy: canAccessAdmin ? 'admin' : 'user', updatedAt: serverTimestamp() },
      { merge: true }
    );
    setStatusMessage('Turno fijo cancelado.');
    await loadFixedBookings(user?.uid, canAccessAdmin);
  };

  const cancelBookingFromAdmin = async (bookingId) => {
    if (!requestConfirmation('¿Estás seguro de que querés cancelar este turno?')) return;
    await deleteDoc(doc(db, 'bookings', bookingId));
    setStatusMessage('Turno cancelado desde administración.');
    await Promise.all([loadCoreData(selectedDate), loadMyBookings(user?.uid)]);
  };

  const prefillManualBooking = ({ date, courtId, hour }) => {
    setActiveSection('admin');
    setManualBookingData((prev) => ({
      ...prev,
      date: date || prev.date,
      courtId: courtId || prev.courtId,
      hour: hour !== undefined && hour !== null ? String(hour) : prev.hour
    }));
    setStatusMessage('Se precargó el turno libre en la planilla manual.');
  };

  const moveBookingFromAdmin = async (bookingId, nextSlot) => {
    if (!bookingId || !nextSlot?.date || !nextSlot?.courtId || nextSlot?.hour === undefined || nextSlot?.hour === null) {
      setStatusMessage('Completá fecha, cancha y horario para mover el turno.');
      return;
    }

    if (!requestConfirmation('¿Querés mover este turno a la nueva fecha/horario?')) return;

    try {
      await runTransaction(db, async (transaction) => {
        const currentBookingRef = doc(db, 'bookings', bookingId);
        const currentBookingDoc = await transaction.get(currentBookingRef);
        if (!currentBookingDoc.exists()) {
          throw new Error('BOOKING_NOT_FOUND');
        }

        const bookingData = currentBookingDoc.data();
        const targetBookingId = `${nextSlot.date}_${nextSlot.courtId}_${Number(nextSlot.hour)}`;
        const targetBookingRef = doc(db, 'bookings', targetBookingId);
        const targetBookingDoc = await transaction.get(targetBookingRef);

        if (targetBookingDoc.exists() && targetBookingId !== bookingId) {
          throw new Error('SLOT_ALREADY_BOOKED');
        }

        transaction.set(targetBookingRef, {
          ...bookingData,
          date: nextSlot.date,
          courtId: nextSlot.courtId,
          hour: Number(nextSlot.hour),
          updatedAt: serverTimestamp()
        });

        if (targetBookingId !== bookingId) {
          transaction.delete(currentBookingRef);
        }
      });

      setStatusMessage('Turno movido correctamente.');
      await Promise.all([loadCoreData(selectedDate), loadMyBookings(user?.uid)]);
    } catch (error) {
      if (error instanceof Error && error.message === 'SLOT_ALREADY_BOOKED') {
        setStatusMessage('El nuevo horario ya está ocupado por otro turno.');
      } else if (error instanceof Error && error.message === 'BOOKING_NOT_FOUND') {
        setStatusMessage('El turno original ya no existe.');
      } else {
        setStatusMessage('No se pudo mover el turno. Intentá nuevamente.');
      }
      await loadCoreData(selectedDate);
    }
  };

  const makeAdministrator = async (uid) => {
    if (!requestConfirmation('¿Estás seguro de que querés otorgar permisos de administrador?')) return;
    await setDoc(doc(db, 'users', uid), { isAdmin: true }, { merge: true });
    setStatusMessage('Usuario actualizado como administrador.');
    setSelectedRoleUser(null);
    setRoleSearch('');
    await loadCoreData(selectedDate);
  };

  const blockUser = async (uid) => {
    if (!requestConfirmation('¿Estás seguro de que querés bloquear a este usuario?')) return;
    await setDoc(doc(db, 'users', uid), { isBlocked: true }, { merge: true });
    setStatusMessage('Usuario bloqueado para reservar turnos.');
    if (selectedRoleUser?.id === uid) {
      setSelectedRoleUser((prev) => (prev ? { ...prev, isBlocked: true } : prev));
    }
    await loadCoreData(selectedDate);
  };

  const unblockUser = async (uid) => {
    if (!requestConfirmation('¿Estás seguro de que querés desbloquear a este usuario?')) return;
    await setDoc(doc(db, 'users', uid), { isBlocked: false }, { merge: true });
    setStatusMessage('Usuario desbloqueado.');
    if (selectedRoleUser?.id === uid) {
      setSelectedRoleUser((prev) => (prev ? { ...prev, isBlocked: false } : prev));
    }
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

  const saveCourtPrice = async (event) => {
    event.preventDefault();
    const parsedPrice = parseCourtPrice(newCourtPrice);
    if (!requestConfirmation('¿Estás seguro de que querés actualizar el valor de la cancha?')) return;
    await setDoc(doc(db, 'settings', 'pricing'), { courtPrice: parsedPrice }, { merge: true });
    setCourtPrice(parsedPrice);
    setNewCourtPrice(String(parsedPrice));
    setStatusMessage('Valor de la cancha actualizado correctamente.');
  };

  const spinRaffle = async () => {
    if (!canAccessAdmin || raffleAnimating) return;

    const eligibleUsers = allUsers.filter((entry) => entry.firstName && entry.phone);
    const itemName = raffleDraft.itemName.trim();

    if (!itemName) {
      setStatusMessage('Ingresá el nombre del artículo antes de girar la ruleta.');
      return;
    }

    if (eligibleUsers.length === 0) {
      setStatusMessage('No hay usuarios registrados con nombre y teléfono para sortear.');
      return;
    }

    setRaffleAnimating(true);

    const animationDuration = 4200;
    const intervalMs = 95;
    let tick = 0;
    const totalTicks = Math.floor(animationDuration / intervalMs);

    const intervalId = setInterval(() => {
      const candidate = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
      setRaffleDraft((prev) => ({
        ...prev,
        winnerId: candidate.id,
        winnerName: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email || 'Participante',
        winnerPhone: candidate.phone || ''
      }));

      tick += 1;
      if (tick >= totalTicks) {
        clearInterval(intervalId);
        setRaffleAnimating(false);
      }
    }, intervalMs);
  };

  const publishRaffleWinner = async () => {
    if (!canAccessAdmin) return;

    const itemName = raffleDraft.itemName.trim();
    if (!itemName) {
      setStatusMessage('Ingresá el artículo del sorteo antes de hacerlo oficial.');
      return;
    }

    if (!raffleDraft.winnerId) {
      setStatusMessage('Primero girá la ruleta para elegir un ganador.');
      return;
    }

    if (!requestConfirmation('¿Querés publicar este resultado como oficial?')) return;

    const drawDate = formatRaffleDrawDate(new Date());

    await addDoc(collection(db, 'raffleHistory'), {
      itemName,
      winnerId: raffleDraft.winnerId,
      winnerName: raffleDraft.winnerName,
      drawDate,
      createdAt: serverTimestamp(),
      publishedBy: user?.uid || null
    });

    await addDoc(collection(db, 'raffleContacts'), {
      itemName,
      winnerId: raffleDraft.winnerId,
      winnerName: raffleDraft.winnerName,
      winnerPhone: raffleDraft.winnerPhone,
      drawDate,
      createdAt: serverTimestamp(),
      publishedBy: user?.uid || null
    });

    setRaffleDraft(emptyRaffleDraft);
    setStatusMessage('Sorteo oficial publicado correctamente.');
    await loadCoreData(selectedDate);
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
  const activeSectionDetails = SECTION_HELP[activeSection];

  const handleChangeSection = (nextSection) => {
    setActiveSection(nextSection);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const profileDraft = {
    fullName: registerData.fullName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
    countryCode: registerData.countryCode || parsedProfilePhone.countryCode || '54',
    areaCode: registerData.areaCode || parsedProfilePhone.areaCode,
    phoneNumber: registerData.phoneNumber || parsedProfilePhone.phoneNumber
  };

  return (
    <div className="app">
      <MainNav activeSection={activeSection} onChangeSection={handleChangeSection} canAccessAdmin={canAccessAdmin} />
      <section className="auth-topbar" aria-label="Accesos de cuenta">
        <div className="auth-topbar-status">
          {user ? (
            <p>
              Sesión iniciada como{' '}
              <strong>{`${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || user.email}</strong>
            </p>
          ) : (
            <p>No iniciaste sesión.</p>
          )}
        </div>
        <div className="auth-topbar-actions">
          {!user ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => goToAuth('login')}>
                Login
              </button>
              <button type="button" onClick={() => goToAuth('register')}>
                Registrarme
              </button>
            </>
          ) : (
            <button type="button" className="btn-secondary" onClick={logoutUser}>
              Cerrar sesión
            </button>
          )}
        </div>
      </section>
      <Header />

      {activeSectionDetails ? (
        <section className="section-guide" aria-live="polite">
          <p className="section-guide-title">{activeSectionDetails.title}</p>
          <p>{activeSectionDetails.description}</p>
        </section>
      ) : null}

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
        {!loading && activeSection === 'reservas' && (
          <BookingPage
            user={user}
            courtPrice={courtPrice}
            myBookings={myBookings}
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

        {!loading && activeSection === 'ganadores' && <RaffleWinnersPage raffleWinners={raffleWinners} />}

        {!loading && activeSection === 'mis-reservas' && (
          <MyBookingsPage
            user={user}
            bookings={visibleMyBookings}
            fixedBookings={visibleMyFixedBookings}
            courts={courts}
            onCancelBooking={cancelBooking}
            onCreateFixedBooking={createFixedBookingFromBooking}
            onUpdateFixedStatus={updateFixedBookingStatus}
            onCancelFixedBooking={cancelFixedBooking}
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
            onChangeAuthView={(view) => {
              setAuthView(view);
              setAuthError('');
            }}
            onChangeLogin={(field, value) => setLoginData((prev) => ({ ...prev, [field]: value }))}
            onChangeRegister={(field, value) => setRegisterData((prev) => ({ ...prev, [field]: value }))}
            onChangeProfileDraft={(field, value) => setRegisterData((prev) => ({ ...prev, [field]: value }))}
            onLogin={loginUser}
            onRecoverPassword={recoverPassword}
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
            courtPrice={courtPrice}
            newCourtPrice={newCourtPrice}
            onChangeNewCourt={setNewCourtName}
            onChangeNewHoliday={setNewHoliday}
            onChangeCourtPrice={setNewCourtPrice}
            onAddCourt={addCourt}
            onSaveCourtPrice={saveCourtPrice}
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
            onBlockUser={blockUser}
            onUnblockUser={unblockUser}
            manualBookingData={manualBookingData}
            onChangeManualBookingField={(field, value) =>
              setManualBookingData((prev) => ({ ...prev, [field]: value }))
            }
            onCreateManualBooking={createManualBooking}
            manualBookableDates={adminBookableDates}
            manualBookableCourts={manualBookingAvailability.courts}
            manualBookableHours={manualBookingAvailability.hoursByCourt[manualBookingData.courtId] || []}
            onPrefillManualBooking={prefillManualBooking}
            onMoveBooking={moveBookingFromAdmin}
            fixedBookings={visibleAdminFixedBookings}
            onUpdateFixedStatus={updateFixedBookingStatus}
            onCancelFixedBooking={cancelFixedBooking}
            raffleDraft={raffleDraft}
            raffleAnimating={raffleAnimating}
            raffleWinners={raffleWinners}
            onChangeRaffleItemName={(value) =>
              setRaffleDraft((prev) => ({
                ...prev,
                itemName: value
              }))
            }
            onSpinRaffle={spinRaffle}
            onPublishRaffleWinner={publishRaffleWinner}
          />
        )}
      </main>

      {statusMessage && <p className="status">{statusMessage}</p>}
    </div>
  );
}

export default App;
