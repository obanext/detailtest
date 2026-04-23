export function toCSV(rows) {
  const headers = ["field", "reference", "mapped", "status"];

  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  return [
    headers.join(","),
    ...rows.map((r) =>
      [r.field, esc(JSON.stringify(r.reference)), esc(JSON.stringify(r.mapped)), r.status].join(",")
    ),
  ].join("\n");
}
