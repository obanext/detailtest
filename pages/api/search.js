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

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

function extractIds(body) {
  if (!body) return [];

  if (Array.isArray(body)) {
    return body
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") return String(item);
        return item?.id || item?.titleId || item?.bibliographicRecordId || item?.recordId;
      })
      .filter(Boolean);
  }

  const candidates =
    body.items ||
    body.results ||
    body.titles ||
    body.titleIds ||
    body.bibliographicRecordIds ||
    body.content ||
    [];

  return asArray(candidates)
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") return String(item);
      return item?.id || item?.titleId || item?.bibliographicRecordId || item?.recordId;
    })
    .filter(Boolean);
}

function extractTotal(body, fallback) {
  if (!body) return fallback;

  return (
    body.total ||
    body.totalElements ||
    body.count ||
    body.numFound ||
    body.totalResults ||
    fallback
  );
}

function extractSuggestions(body) {
  if (!body) return [];

  if (Array.isArray(body)) return body;

  return (
    body.suggestions ||
    body.spellcheck?.suggestions ||
    body.spellcheck ||
    body.items ||
    body.results ||
    []
  );
}

export default async function handler(req, res) {
  const { q = "", page = "1", limit = "20", suggest = "" } = req.query;

  const query = String(q || "").trim();

  if (suggest === "1") {
    if (query.length < 2) {
      return res.status(200).json({
        suggestions: [],
        debug: { calls: [] },
      });
    }

    const spell = await fetchSafe(
      `${BASE}/title/catalog/NBC_PLUS/spellcheck?q=${encodeURIComponent(query)}&qt=/spell&scope=ALL`
    );

    return res.status(200).json({
      suggestions: extractSuggestions(spell.body),
      debug: {
        calls: [spell],
      },
    });
  }

  if (!query) {
    const raw = {
      query,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      total: 0,
      ids: [],
      titles: [],
      suggestions: [],
      debug: { calls: [] },
    };

    const mapped = mapWiseSearchToObaFull(raw);

    return res.status(200).json({ raw, mapped });
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.max(Math.min(Number(limit) || 20, 50), 1);
  const offset = (pageNumber - 1) * limitNumber;

  const titleList = await fetchSafe(
    `${BASE}/titlelist?searchTerm=${encodeURIComponent(query)}&offset=${offset}&limit=${limitNumber}&branchIds=1000`
  );

  const ids = extractIds(titleList.body);
  const total = extractTotal(titleList.body, ids.length);

  const titleCalls = await Promise.all(
    ids.slice(0, limitNumber).map(async (id) => {
      const call = await fetchSafe(`${BASE}/discovery/title/${encodeURIComponent(id)}`);

      return {
        id,
        call,
        title: call.body,
      };
    })
  );

  const validTitles = titleCalls
    .filter((entry) => entry.title && typeof entry.title === "object")
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
    }));

  const spell = await fetchSafe(
    `${BASE}/title/catalog/NBC_PLUS/spellcheck?q=${encodeURIComponent(query)}&qt=/spell&scope=ALL`
  );

  const raw = {
    query,
    page: pageNumber,
    limit: limitNumber,
    total,
    ids,
    titles: validTitles,
    suggestions: extractSuggestions(spell.body),
    debug: {
      calls: [
        titleList,
        ...titleCalls.map((entry) => entry.call),
        spell,
      ],
    },
  };

  const mapped = mapWiseSearchToObaFull(raw);

  res.status(200).json({ raw, mapped });
}
