export const toLocalDate = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const buildUpcomingDates = (totalDays = 7) => {
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  return Array.from({ length: totalDays }, (_, idx) => {
    const date = new Date(base);
    date.setDate(base.getDate() + idx);
    return toLocalDate(date);
  });
};

export const formatLongDate = (isoDate) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });


const argentinaNowFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

export const getArgentinaNow = () => {
  const parts = argentinaNowFormatter.formatToParts(new Date());
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${partMap.year}-${partMap.month}-${partMap.day}`,
    hour: Number(partMap.hour),
    minute: Number(partMap.minute)
  };
};

export const isPastSlotInArgentina = (isoDate, hour) => {
  const now = getArgentinaNow();

  if (isoDate < now.date) return true;
  if (isoDate > now.date) return false;

  return hour < now.hour || (hour === now.hour && now.minute > 0);
};

export const isTooLateToCancelInArgentina = (isoDate, hour) => {
  const now = getArgentinaNow();

  if (isoDate < now.date) return true;
  if (isoDate > now.date) return false;

  const remainingMinutes = hour * 60 - (now.hour * 60 + now.minute);
  return remainingMinutes <= 60;
};
