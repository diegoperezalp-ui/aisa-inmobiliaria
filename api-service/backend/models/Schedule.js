import mongoose from 'mongoose';

const timeRangeSchema = new mongoose.Schema({
  start: {
    type: String,
    required: true,
    trim: true,
    match: /^([01]\d|2[0-3]):[0-5]\d$/,
  },
  end: {
    type: String,
    required: true,
    trim: true,
    match: /^([01]\d|2[0-3]):[0-5]\d$/,
  },
}, { _id: false });

const weeklyScheduleSchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true,
    min: 0,
    max: 6,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  ranges: {
    type: [timeRangeSchema],
    default: [],
  },
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  timezone: {
    type: String,
    required: true,
    default: 'America/Monterrey',
    trim: true,
  },
  slotDurationMinutes: {
    type: Number,
    required: true,
    default: 60,
    min: 15,
    max: 240,
  },
  weekly: {
    type: [weeklyScheduleSchema],
    default: [
      { day: 1, enabled: true, ranges: [{ start: '10:00', end: '18:00' }] },
      { day: 2, enabled: true, ranges: [{ start: '10:00', end: '18:00' }] },
      { day: 3, enabled: true, ranges: [{ start: '10:00', end: '18:00' }] },
      { day: 4, enabled: true, ranges: [{ start: '10:00', end: '18:00' }] },
      { day: 5, enabled: true, ranges: [{ start: '10:00', end: '18:00' }] },
      { day: 6, enabled: false, ranges: [] },
      { day: 0, enabled: false, ranges: [] },
    ],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

scheduleSchema.pre('validate', function validateSchedule(next) {
  const days = this.weekly.map((schedule) => schedule.day);
  if (new Set(days).size !== days.length) {
    next(new mongoose.Error.ValidationError(this));
    return;
  }

  for (const schedule of this.weekly) {
    for (const range of schedule.ranges) {
      if (range.start >= range.end) {
        next(new mongoose.Error.ValidationError(this));
        return;
      }
    }
  }

  next();
});

const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);

export default Schedule;
