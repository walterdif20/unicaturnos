# La Única - Sistema de Turnos

Aplicación web en React + Vite con Firebase para gestionar reservas de canchas de fútbol.

## Funcionalidades

- Landing page usando imágenes del complejo (`logo.jpg` e `imagendelcomplejo.jpg`).
- Vista de turnos disponibles por día, hora y cancha.
- Bloqueo automático de reservas en fechas marcadas como feriado.
- Alta y baja de canchas.
- Configuración de horarios por cancha y por día de la semana.
- Registro e inicio de sesión para usuarios.
- Registro pidiendo nombre, apellido y celular.
- Persistencia en Firebase Auth + Firestore.

## Requisitos

- Node.js 18+
- Proyecto de Firebase con Authentication (Email/Password) y Firestore habilitados.

## Variables de entorno

Crear un archivo `.env`:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Instalación y ejecución

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Modelo de datos sugerido (Firestore)

- `users/{uid}`: `firstName`, `lastName`, `phone`, `email`
- `courts/{courtId}`: `name`
- `schedules/{courtId}`: mapa por día (`0..6`) con `open` y `close`
- `settings/holidays`: `dates: string[]` en formato `YYYY-MM-DD`
- `bookings/{bookingId}`: `courtId`, `date`, `hour`, `userId`, `userName`, `userPhone`, `createdAt`
