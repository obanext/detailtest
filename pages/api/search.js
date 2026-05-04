import { mapWiseSearchToObaFull } from "../../mapping/mapWiseSearchToObaFull";

const BASE = "https://bibliotheek-accept1.wise.oclc.org/restapi";

const headers = {
  Accept: "application/json",
  application: process.env.APPLICATION,
  WISE_KEY: process.env.WISE_KEY,
};

async function fetchSafe(url) {
  try {
    const res = await fetch(url, { headers });
    const body = await res.json().catch(() => null);
    return { url, status: res.status, body };
  } catch {
    return { url, status: 500, body: null };
  }
}

export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) return res.status(400).json({ error: "missing query" });

  const titleListCall = await fetchSafe(
    `${BASE}/titlelist?searchTerm=${encodeURIComponent(q)}&limit=20`
  );

  const ids = (titleListCall.body || [])
    .map((x) => x.id || x.titleId)
    .filter(Boolean);

  const titleCalls = await Promise.all(
    ids.map((id) =>
      fetchSafe(`${BASE}/discovery/title/${id}`)
    )
  );

  const raw = {
    query: q,
    total: ids.length,
    titles: titleCalls.map((call, i) => ({
      id: ids[i],
      title: call.body
    })),
    debug: {
      calls: [titleListCall, ...titleCalls]
    }
  };

  const mapped = mapWiseSearchToObaFull(raw);

  res.status(200).json({ raw, mapped });
}
