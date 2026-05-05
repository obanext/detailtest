import { mapWiseSearchToObaFull } from "../../mapping/mapWiseSearchToObaFull";

const BASE = "https://bibliotheek-accept1.wise.oclc.org/restapi";
const BRANCH_ID = "1000";
const DEFAULT_PERSPECTIVE_ID = "3687";
const DEFAULT_SCOPE = "anything";

const searchHeaders = {
  Accept: "application/json",
  wise_key: process.env.WISE_SEARCH_KEY,
};

const discoveryHeaders = {
  Accept: "application/json",
  application: process.env.APPLICATION,
  WISE_KEY: process.env.WISE_KEY,
};

async function fetchSafe(url, headers = searchHeaders) {
  try {
    const res = await fetch(url, { headers });
    const bodyText = await res.text();

    let body = null;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = bodyText || null;
    }

    return { url, status: res.status, ok: res.ok, body };
  } catch (error) {
    return { url, status: 500, ok: false, body: null, error: error.message };
  }
}

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

function extractPerspectives(body) {
  return asArray(body?.perspective);
}

function extractSearchItems(body) {
  if (!body || typeof body !== "object") return [];

  const candidates =
    body.titles ||
    body.title ||
    body.items ||
    body.results ||
    body.result ||
    body.content ||
    body.documents ||
    body.titleSummaries ||
    body.summaries ||
    [];

  return asArray(candidates);
}

function extractId(item) {
  if (!item) return "";

  if (typeof item === "string" || typeof item === "number") return String(item);

  return (
    item.id ||
    item.titleId ||
    item.bibliographicRecordId ||
    item.recordId ||
    item?.title?.id ||
    item?.document?.id ||
    ""
  );
}

function extractPpn(item) {
  if (!item || typeof item !== "object") return "";

  const candidates = [
    item.ppn,
    item.ppnId,
    item.ppnNumber,
    item?.title?.ppn,
    item?.title?.ppnId,
    item?.identifiers?.ppn,
    item?.identifiers?.["ppn-id"],
    item?.identifier?.ppn,
    item?.record?.ppn,
    item?.document?.ppn,
  ];

  for (const candidate of candidates) {
    const value = asArray(candidate)[0];
    if (typeof value === "string" || typeof value === "number") {
      return text(value).replace(/^PPN:/i, "");
    }

    if (value && typeof value === "object") {
      const nested =
        value._text ||
        value.value ||
        value.id ||
        value.searchTerm ||
        value?.["_text"];
      if (nested) return text(nested).replace(/^PPN:/i, "");
    }
  }

  const id = text(extractId(item));
  if (id.toUpperCase().startsWith("PPN:")) {
    return id.replace(/^PPN:/i, "");
  }

  return "";
}

function isNumericId(value) {
  return /^\d+$/.test(text(value));
}

function extractTotal(body, fallback) {
  if (!body || typeof body !== "object") return fallback;

  return (
    body.total ||
    body.totalElements ||
    body.count ||
    body.numFound ||
    body.totalResults ||
    body.numberOfResults ||
    body.resultCount ||
    fallback
  );
}

function looksLikeTitle(item) {
  if (!item || typeof item !== "object") return false;

  return Boolean(
    item.title ||
      item.mainTitle ||
      item.author ||
      item.imageUrls ||
      item.publicationYear ||
      item.isbn ||
      item.ppn
  );
}

function normalizeSearchTitleItem(item, resolvedDetailId = "") {
  if (!item || typeof item !== "object") return null;

  if (item.title && typeof item.title === "object") {
    return {
      id: resolvedDetailId || extractId(item),
      sourceId: extractId(item),
      resolvedDetailId: resolvedDetailId || "",
      title: {
        ...item.title,
        id: resolvedDetailId || item.title.id || extractId(item),
      },
    };
  }

  if (looksLikeTitle(item)) {
    return {
      id: resolvedDetailId || extractId(item),
      sourceId: extractId(item),
      resolvedDetailId: resolvedDetailId || "",
      title: {
        ...item,
        id: resolvedDetailId || item.id || extractId(item),
      },
    };
  }

  return null;
}

function appendParam(url, key, value) {
  if (value === undefined || value === null || value === "") return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function appendRepeatedParam(url, key, values) {
  return asArray(values).reduce((nextUrl, value) => appendParam(nextUrl, key, value), url);
}

async function resolvePpnToTitleId(ppn) {
  const cleanPpn = text(ppn).replace(/^PPN:/i, "");
  if (!cleanPpn) return { id: "", call: null };

  const call = await fetchSafe(`${BASE}/titleid/ppn/${encodeURIComponent(cleanPpn)}`, discoveryHeaders);
  const body = call.body;

  let id = "";

  if (Array.isArray(body) && body.length) {
    id =
      body[0]?.bibliographicRecordId ||
      body[0]?.id ||
      body[0]?.titleId ||
      body[0]?.recordId ||
      "";
  } else if (body && typeof body === "object") {
    id =
      body.bibliographicRecordId ||
      body.id ||
      body.titleId ||
      body.recordId ||
      "";
  }

  return { id: text(id), call };
}

async function resolveItemToDetailId(item) {
  const rawId = text(extractId(item));

  if (isNumericId(rawId)) {
    return { detailId: rawId, calls: [] };
  }

  const ppn = extractPpn(item);

  if (!ppn) {
    return { detailId: "", calls: [] };
  }

  const resolved = await resolvePpnToTitleId(ppn);

  return {
    detailId: resolved.id,
    calls: resolved.call ? [resolved.call] : [],
  };
}

export default async function handler(req, res) {
  const {
    q = "",
    page = "1",
    limit = "20",
    suggest = "",
    perspectiveId = DEFAULT_PERSPECTIVE_ID,
    searchScope = DEFAULT_SCOPE,
    facetFilter = [],
    filterAvailableTitles = "false",
  } = req.query;

  const query = String(q || "").trim();

  if (suggest === "1") {
    return res.status(200).json({
      suggestions: [],
      debug: { calls: [] },
    });
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.max(Math.min(Number(limit) || 20, 50), 1);
  const offset = (pageNumber - 1) * limitNumber;

  const perspectiveUrl = `${BASE}/branch/${BRANCH_ID}/clienttype/default/perspective`;
  const perspectiveCall = await fetchSafe(perspectiveUrl, searchHeaders);
  const perspectives = extractPerspectives(perspectiveCall.body);

  if (!query) {
    const raw = {
      query,
      page: pageNumber,
      limit: limitNumber,
      total: 0,
      ids: [],
      titles: [],
      suggestions: [],
      perspectives,
      selectedPerspectiveId: String(perspectiveId || DEFAULT_PERSPECTIVE_ID),
      selectedSearchScope: String(searchScope || DEFAULT_SCOPE),
      selectedSort: "",
      selectedFacetFilters: asArray(facetFilter),
      searchResponse: null,
      debug: {
        calls: [perspectiveCall],
      },
    };

    const mapped = mapWiseSearchToObaFull(raw);

    return res.status(200).json({ raw, mapped });
  }

  let titleSummaryUrl =
    `${BASE}/branch/${BRANCH_ID}/perspective/${encodeURIComponent(
      perspectiveId || DEFAULT_PERSPECTIVE_ID
    )}/titlesummary` +
    `?returnType=default` +
    `&term=${encodeURIComponent(query)}` +
    `&offset=${offset}` +
    `&limit=${limitNumber}` +
    `&searchScope=${encodeURIComponent(searchScope || DEFAULT_SCOPE)}` +
    `&filterAvailableTitles=${encodeURIComponent(filterAvailableTitles)}` +
    `&enableMultiSelectFaceting=true`;

  titleSummaryUrl = appendRepeatedParam(titleSummaryUrl, "facetFilter", facetFilter);

  const searchCall = await fetchSafe(titleSummaryUrl, searchHeaders);
  const searchItems = extractSearchItems(searchCall.body);

  const resolvedItems = await Promise.all(
    searchItems.slice(0, limitNumber).map(async (item) => {
      const resolved = await resolveItemToDetailId(item);
      return {
        item,
        detailId: resolved.detailId,
        resolveCalls: resolved.calls,
      };
    })
  );

  const directTitles = resolvedItems
    .filter((entry) => isNumericId(entry.detailId))
    .map(({ item, detailId }) => normalizeSearchTitleItem(item, detailId))
    .filter(Boolean);

  const directTitleIds = new Set(directTitles.map((entry) => String(entry.id)));

  const idsToHydrate = resolvedItems
    .map((entry) => entry.detailId)
    .filter(Boolean)
    .filter((id) => !directTitleIds.has(String(id)))
    .slice(0, limitNumber);

  const titleCalls = await Promise.all(
    idsToHydrate.map(async (id) => {
      const call = await fetchSafe(
        `${BASE}/discovery/title/${encodeURIComponent(id)}`,
        discoveryHeaders
      );

      return {
        id,
        call,
        title: call.body,
      };
    })
  );

  const hydratedTitles = titleCalls
    .filter((entry) => entry.title && typeof entry.title === "object")
    .map((entry) => ({
      id: entry.id,
      sourceId: entry.id,
      resolvedDetailId: entry.id,
      title: {
        ...entry.title,
        id: entry.id,
      },
    }));

  const allResolvedIds = [
    ...directTitles.map((entry) => entry.id),
    ...hydratedTitles.map((entry) => entry.id),
  ].filter(Boolean);

  const total = extractTotal(searchCall.body, allResolvedIds.length);

  const raw = {
    query,
    page: pageNumber,
    limit: limitNumber,
    total,
    ids: allResolvedIds,
    titles: [...directTitles, ...hydratedTitles],
    suggestions: [],
    perspectives,
    selectedPerspectiveId: String(perspectiveId || DEFAULT_PERSPECTIVE_ID),
    selectedSearchScope: String(searchScope || DEFAULT_SCOPE),
    selectedSort: "",
    selectedFacetFilters: asArray(facetFilter),
    searchResponse: searchCall.body,
    resolvedItems: resolvedItems.map((entry) => ({
      sourceId: extractId(entry.item),
      ppn: extractPpn(entry.item),
      detailId: entry.detailId,
    })),
    debug: {
      calls: [
        perspectiveCall,
        searchCall,
        ...resolvedItems.flatMap((entry) => entry.resolveCalls),
        ...titleCalls.map((entry) => entry.call),
      ],
    },
  };

  const mapped = mapWiseSearchToObaFull(raw);

  return res.status(200).json({ raw, mapped });
}
