import { mapWiseSearchToObaFull } from "../../mapping/mapWiseSearchToObaFull";

const BASE = "https://bibliotheek-accept1.wise.oclc.org/restapi";
const BRANCH_ID = "1000";
const DEFAULT_PERSPECTIVE_ID = "3687";
const DEFAULT_SCOPE = "anything";
const DEFAULT_SORT = "2910";

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

function extractSuggestions(body) {
  if (!body) return [];
  if (Array.isArray(body)) return body;

  return (
    body.suggestions ||
    body.items ||
    body.results ||
    body.searchSuggestions ||
    body.titleSuggestions ||
    []
  );
}

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

function normalizeSearchTitleItem(item) {
  if (!item || typeof item !== "object") return null;

  if (item.title && typeof item.title === "object") {
    return {
      id: extractId(item),
      title: item.title,
    };
  }

  if (looksLikeTitle(item)) {
    return {
      id: extractId(item),
      title: item,
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

export default async function handler(req, res) {
  const {
    q = "",
    page = "1",
    limit = "20",
    suggest = "",
    perspectiveId = DEFAULT_PERSPECTIVE_ID,
    searchScope = DEFAULT_SCOPE,
    sort = DEFAULT_SORT,
    facetFilter = [],
    filterAvailableTitles = "false",
  } = req.query;

  const query = String(q || "").trim();

  if (suggest === "1") {
    if (query.length < 2) {
      return res.status(200).json({
        suggestions: [],
        debug: { calls: [] },
      });
    }

    const suggestionUrl =
      `${BASE}/branch/${BRANCH_ID}/searchsuggestion` +
      `?term=${encodeURIComponent(query)}` +
      `&searchScope=${encodeURIComponent(searchScope || DEFAULT_SCOPE)}` +
      `&clientType=default`;

    const suggestion = await fetchSafe(suggestionUrl, searchHeaders);

    return res.status(200).json({
      suggestions: extractSuggestions(suggestion.body),
      debug: {
        calls: [suggestion],
      },
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
      selectedSort: String(sort || DEFAULT_SORT),
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

  if (sort) {
    titleSummaryUrl = appendParam(titleSummaryUrl, "sort", sort);
  }

  titleSummaryUrl = appendRepeatedParam(titleSummaryUrl, "facetFilter", facetFilter);

  const searchCall = await fetchSafe(titleSummaryUrl, searchHeaders);
  const searchItems = extractSearchItems(searchCall.body);
  const total = extractTotal(searchCall.body, searchItems.length);

  const directTitles = searchItems.map(normalizeSearchTitleItem).filter(Boolean);
  const directTitleIds = new Set(directTitles.map((entry) => String(entry.id)));

  const idsToHydrate = searchItems
    .map(extractId)
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
      title: entry.title,
    }));

  const suggestionUrl =
    `${BASE}/branch/${BRANCH_ID}/searchsuggestion` +
    `?term=${encodeURIComponent(query)}` +
    `&searchScope=${encodeURIComponent(searchScope || DEFAULT_SCOPE)}` +
    `&clientType=default`;

  const suggestion = await fetchSafe(suggestionUrl, searchHeaders);

  const raw = {
    query,
    page: pageNumber,
    limit: limitNumber,
    total,
    ids: [...directTitles.map((entry) => entry.id), ...idsToHydrate],
    titles: [...directTitles, ...hydratedTitles],
    suggestions: extractSuggestions(suggestion.body),
    perspectives,
    selectedPerspectiveId: String(perspectiveId || DEFAULT_PERSPECTIVE_ID),
    selectedSearchScope: String(searchScope || DEFAULT_SCOPE),
    selectedSort: String(sort || DEFAULT_SORT),
    selectedFacetFilters: asArray(facetFilter),
    searchResponse: searchCall.body,
    debug: {
      calls: [
        perspectiveCall,
        searchCall,
        ...titleCalls.map((entry) => entry.call),
        suggestion,
      ],
    },
  };

  const mapped = mapWiseSearchToObaFull(raw);

  return res.status(200).json({ raw, mapped });
}
