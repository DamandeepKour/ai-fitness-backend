/** Escape a single CSV field per RFC 4180 (quote if it contains a comma, quote, or newline). */
function escapeCsvField(value) {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of flat objects into a CSV string.
 * `columns` is an ordered list of `{ key, label }` (label defaults to key).
 * If `columns` is omitted, keys from the first row are used as-is.
 */
export function rowsToCsv(rows = [], columns = null) {
  const cols = columns || Object.keys(rows[0] || {}).map((key) => ({ key, label: key }));

  const header = cols.map((c) => escapeCsvField(c.label ?? c.key)).join(",");
  const lines = rows.map((row) =>
    cols.map((c) => escapeCsvField(row[c.key])).join(","),
  );

  return [header, ...lines].join("\r\n");
}

/** Send `rows` as a downloadable CSV attachment. */
export function sendCsv(res, filename, rows, columns = null) {
  const csv = rowsToCsv(rows, columns);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(csv);
}
