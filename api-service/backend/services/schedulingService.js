import Schedule from '../models/Schedule.js';
import Visit from '../models/Visit.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const addDays = (date, days) => {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + days);
  return result;
};

const toDateKey = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const minutesFromTime = time => {
  const match = TIME_PATTERN.exec(String(time || '').trim());
  return match ? (Number(match[1]) * 60) + Number(match[2]) : null;
};

const formatTime = totalMinutes => {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

const formatSlot = date => new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(date);

const getVisitDate = visit => visit.scheduledDate || visit.date || '';
const getVisitMinute = visit => minutesFromTime(visit.scheduledTime || visit.time);

export async function findAvailableSlots(startDate = new Date(), durationDays = 7, schedule = null) {
  const baseDate = startDate instanceof Date ? new Date(startDate) : new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(baseDate.getTime())) throw new TypeError('Fecha de inicio invalida');
  baseDate.setHours(12, 0, 0, 0);

  const adminSchedule = schedule || await Schedule.findOne({ isActive: true }).sort({ updatedAt: -1 }).lean();
  if (!adminSchedule) {
    return { slots: [], isSaturated: false, searchedDays: durationDays };
  }

  const gatherSlots = async days => {
    const endKey = toDateKey(addDays(baseDate, days));
    const startKey = toDateKey(baseDate);
    const visits = await Visit.find({
      status: { $ne: 'cancelada' },
      $or: [
        { scheduledDate: { $gte: startKey, $lte: endKey } },
        { scheduledDate: '', date: { $gte: startKey, $lte: endKey } },
      ],
    }).lean();

    const occupied = new Map();
    visits.forEach(visit => {
      const date = getVisitDate(visit);
      const minute = getVisitMinute(visit);
      if (date && minute !== null) occupied.set(`${date}|${minute}`, true);
    });

    const slots = [];
    const duration = adminSchedule.slotDurationMinutes || 60;

    for (let offset = 0; offset <= days; offset += 1) {
      const day = addDays(baseDate, offset);
      const daySchedule = (adminSchedule.weekly || []).find(item => item.day === day.getDay() && item.enabled);
      if (!daySchedule) continue;

      for (const range of daySchedule.ranges || []) {
        const start = minutesFromTime(range.start);
        const end = minutesFromTime(range.end);
        if (start === null || end === null) continue;

        for (let minute = start; minute + duration <= end; minute += duration) {
          const dateKey = toDateKey(day);
          if (occupied.has(`${dateKey}|${minute}`)) continue;

          slots.push({
            date: dateKey,
            time: formatTime(minute),
            label: `${formatSlot(day)} a las ${formatTime(minute)}`,
          });
        }
      }
    }

    return slots;
  };

  let slots = await gatherSlots(durationDays);
  let isSaturated = false;
  if (slots.length < 2 && durationDays <= 7) {
    slots = await gatherSlots(14);
    isSaturated = true;
  }

  return {
    slots: slots.slice(0, 3),
    isSaturated,
    searchedDays: isSaturated ? 14 : durationDays,
  };
}
