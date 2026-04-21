export function getDateKeySA(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";

  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function shiftDateKey(dateKey: string, daysToShift: number) {
  const dt = parseDateKey(dateKey);
  dt.setDate(dt.getDate() + daysToShift);

  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");

  return `${yy}-${mm}-${dd}`;
}

export function formatDateKey(dateKey?: string) {
  if (!dateKey) {
    return {
      dayName: "",
      dateFormatted: "",
    };
  }

  const dateObj = new Date(`${dateKey}T00:00:00`);

  return {
    dayName: dateObj.toLocaleDateString("en-US", { weekday: "short" }),
    dateFormatted: dateObj.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    }),
  };
}

export function getMonthLabel(dateKey?: string) {
  if (!dateKey) return "";
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function getDayName(dateKey?: string) {
  if (!dateKey) return "";
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}


export function diffDaysInclusive(startKey: string, endKey: string) {
  const a = parseDateKey(startKey);
  const b = parseDateKey(endKey);
  const ms = b.getTime() - a.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return Math.max(0, days) + 1;
}

export function isoWeekKeyFromDateKey(dateKey: string) {
  const d = parseDateKey(dateKey);
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (date.getDay() + 6) % 7;

  date.setDate(date.getDate() - day + 3);

  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;

  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);

  const weekNo =
    1 +
    Math.round(
      (date.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

  const year = date.getFullYear();
  const ww = String(weekNo).padStart(2, "0");

  return `${year}-W${ww}`;
}