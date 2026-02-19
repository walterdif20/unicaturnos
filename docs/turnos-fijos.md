# Propuesta funcional: turnos fijos (suscripción semanal)

## Objetivo

Permitir que una persona convierta un turno puntual en un **turno fijo semanal** (ejemplo: todos los martes a las 20:00 en la cancha X) y que tanto cliente como administración puedan **pausar/cancelar** ese esquema de forma simple.

## Principios de diseño (simplicidad primero)

1. **Un turno fijo es una regla**, no un único turno.
2. **Los turnos concretos siguen existiendo** (para operación diaria), pero pueden estar vinculados a una regla fija.
3. **No reservar meses completos de una vez**: generar en una ventana corta (por ejemplo 4 semanas) para evitar bloqueos largos y errores.
4. **Siempre mostrar estado claro**: activo, pausado, cancelado, con próxima fecha.
5. **Cliente con 2 acciones máximas**: crear fijo desde una reserva y cancelar/pausar desde “Mis turnos”.

## Modelo funcional propuesto

### 1) Nueva entidad: `fixedBookings`

Colección sugerida:

- `fixedBookings/{fixedId}`
  - `userId`
  - `courtId`
  - `weekday` (0-6)
  - `hour`
  - `status` (`active | paused | cancelled`)
  - `startDate` (primer día efectivo)
  - `endDate` (opcional)
  - `createdAt`
  - `updatedAt`
  - `cancelledBy` (`user | admin`, opcional)
  - `notes` (opcional admin)

### 2) Extensión de `bookings`

Agregar campos opcionales a cada turno generado por regla fija:

- `source` (`single | fixed`)
- `fixedId` (si viene de turno fijo)
- `occurrenceDate` (fecha puntual de esa ocurrencia)

Con esto se mantiene intacta la operación actual de reservas, pero se distingue origen.

## Flujo cliente (simple)

### Alta de turno fijo

1. Usuario reserva normalmente un turno (como hoy).
2. En confirmación, mostrar CTA:
   - “¿Querés repetir este turno todas las semanas?”
3. Al aceptar:
   - Crear `fixedBookings` en estado `active`.
   - Generar (o asegurar) próximas 4 ocurrencias si están libres.
4. Mostrar resultado:
   - “Turno fijo activo. Próximo: martes 20:00.”
   - Si alguna semana no pudo reservarse por conflicto, avisar explícitamente.

### Gestión desde “Mis turnos”

Separar visualmente:

- **Turnos próximos** (instancias concretas)
- **Mis turnos fijos** (reglas)

Acciones por turno fijo:

- `Pausar` (no genera nuevas ocurrencias)
- `Reactivar`
- `Cancelar definitivamente`

Acción opcional útil:

- “Saltar solo esta semana” (cancela una ocurrencia puntual, mantiene la regla).

## Flujo administración (simple)

En panel de admin agregar pestaña “Turnos fijos” con tabla:

- Cliente
- Día/hora
- Cancha
- Estado
- Próxima ocurrencia
- Conflictos pendientes (si hay)
- Acciones: pausar, reactivar, cancelar

### Reglas recomendadas para admin

- Admin puede forzar cancelación y dejar nota.
- Admin puede filtrar por día para detectar saturación (ej. martes 20:00).
- Al eliminar cancha/horario, marcar fijos afectados y notificar.

## Motor de generación (la parte clave)

Para mantenerlo simple y robusto:

1. Job periódico (o trigger) recorre `fixedBookings` activos.
2. Garantiza que existan ocurrencias para próximas 4 semanas.
3. Antes de crear cada booking, valida disponibilidad exacta (`courtId+date+hour`).
4. Si ocupado, registra conflicto sin romper el resto.

### ¿Por qué ventana de 4 semanas?

- Evita bloquear agenda a largo plazo.
- Permite cambios de horario/canchas sin migraciones complejas.
- Reduce impacto de errores.

## Política de conflictos (transparente)

Cuando una ocurrencia fija no se puede crear:

- Se mantiene la regla `active`.
- Se registra “conflicto de ocurrencia” para esa fecha.
- Cliente y admin ven alerta: “No se pudo reservar el martes 12/03 a las 20:00 por ocupación.”

Esto evita que un solo choque destruya el turno fijo completo.

## UX mínima recomendada

### Cliente

- Checkbox en reserva: “Convertir en turno fijo semanal”.
- Badge en turnos: “Fijo”.
- Tarjeta resumida:
  - “Todos los martes · 20:00 · Cancha 1 · Estado: Activo”.

### Admin

- Tabla con filtros por día/cancha/estado.
- Estado con colores:
  - Activo (verde)
  - Pausado (amarillo)
  - Cancelado (gris)
  - Con conflicto (rojo)

## Reglas de negocio sugeridas

1. Un usuario no puede tener dos turnos fijos iguales (misma cancha+día+hora).
2. Si hay deuda/no confirmación reiterada, admin puede pausar automático.
3. Cancelación por usuario impacta solo ocurrencias futuras.
4. Las ocurrencias ya pasadas quedan como historial (auditoría).

## Implementación incremental (sin romper lo actual)

### Fase 1 (MVP)

- Crear `fixedBookings`.
- Alta desde reserva existente.
- Lista “Mis turnos fijos” con pausar/cancelar.
- Job de generación a 4 semanas.

### Fase 2

- Vista admin de turnos fijos.
- Alertas de conflictos.
- Filtros por saturación horaria.

### Fase 3

- Saltar semana puntual.
- Reasignación asistida (sugerir cancha/hora alternativa).

## Beneficios de esta estrategia

- **Simple para cliente**: activa con 1 click y gestiona con 2-3 botones.
- **Simple para admin**: ve reglas, no cientos de turnos dispersos.
- **Bajo riesgo técnico**: no se rompe el modelo de booking actual, se extiende.
- **Escalable**: luego permite prioridades, listas de espera o renovaciones automáticas.
