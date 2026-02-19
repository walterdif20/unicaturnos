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

# Opcionales (solo si usás esos servicios)
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_FIREBASE_FUNCTIONS_REGION=us-central1
```

> Importante: cada variable debe ir en **su propia línea**. Si pegás todo junto con `\n`, Firebase no inicializa correctamente.
> Nota: `VITE_FIREBASE_FUNCTIONS_REGION` debe ser una **región** (ej: `us-central1`), no un Measurement ID (`G-...`).

> Si en consola aparece `CONFIGURATION_NOT_FOUND` al registrar/iniciar sesión, el problema está en Firebase Auth del proyecto (API key de otro proyecto o Authentication no habilitado), no en Firestore.

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


## Seguridad (Firestore Rules)

> Importante: ocultar botones en frontend **no** reemplaza autorización en backend.

Se agregó `firestore.rules` para que:
- solo admins puedan escribir en `courts`, `schedules`, `settings` y gestionar admins.
- usuarios normales solo puedan crear/cancelar sus propias reservas.
- un usuario no pueda escalar privilegios cambiando su `isAdmin`.

### Deploy de reglas

```bash
npm i -g firebase-tools
firebase login
firebase use <tu-proyecto>
firebase deploy --only firestore:rules
```

## Modelo de datos sugerido (Firestore)

- `users/{uid}`: `firstName`, `lastName`, `phone`, `email`
- `courts/{courtId}`: `name`
- `schedules/{courtId}`: mapa por día (`0..6`) con `open` y `close`
- `settings/holidays`: `dates: string[]` en formato `YYYY-MM-DD`
- `bookings/{bookingId}`: `courtId`, `date`, `hour`, `userId`, `userName`, `userPhone`, `createdAt`
