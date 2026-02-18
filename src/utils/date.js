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
