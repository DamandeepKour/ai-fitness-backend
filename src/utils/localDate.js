const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(value) {
  return typeof value === "string" && YMD.test(value);
}

/** Server calendar date (Node process timezone). Prefer client-sent YMD when possible. */
export function serverCalendarYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
