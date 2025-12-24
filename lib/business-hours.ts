interface BusinessHoursSchedule {
  [day: string]: { start: string; end: string } | null;
}

interface BusinessHoursSettings {
  timezone: string;
  schedule: BusinessHoursSchedule;
}

export function isWithinBusinessHours(settings: BusinessHoursSettings): boolean {
  const { timezone, schedule } = settings;

  // Get current time in business timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts
    .find((p) => p.type === "weekday")
    ?.value.toLowerCase();
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;

  if (!weekday || !hour || !minute) return false;

  const daySchedule = schedule[weekday];
  if (!daySchedule) return false;

  const currentTime = `${hour}:${minute}`;
  return currentTime >= daySchedule.start && currentTime <= daySchedule.end;
}

export function getNextBusinessDay(settings: BusinessHoursSettings): string {
  const { timezone, schedule } = settings;
  const now = new Date();

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + i);

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
    });

    const weekday = formatter.format(checkDate).toLowerCase();
    const daySchedule = schedule[weekday];

    if (daySchedule) {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(checkDate);
    }
  }

  return "soon";
}
