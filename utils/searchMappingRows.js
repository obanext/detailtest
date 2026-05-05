const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

function firstResult(mapped = {}) {
  return asArray(mapped?.results?.result)[0] || {};
}

function firstRawTitle(raw = {}) {
  return asArray(raw?.titles)[0]?.title || {};
}

export function buildSearchMappingRows(raw = {}, mapped = {}) {
  const result = firstResult(mapped);
  const title = firstRawTitle(raw);

  const rows = [
    [
      "Perspectives",
      "raw.perspectives[]",
      "/branch/1000/clienttype/default/perspective",
      "perspective[]",
      JSON.stringify(raw?.perspectives || []),
      JSON.stringify(raw?.perspectives || []),
    ],
    [
      "Aantal resultaten",
      "meta.count._text",
      "/branch/1000/perspective/{perspectiveId}/search",
      "total/count",
      mapped?.meta?.count?._text || "",
      String(raw?.total || ""),
    ],
    [
      "Zoekterm",
      "meta.query._text",
      "/branch/1000/perspective/{perspectiveId}/search",
      "term",
      mapped?.meta?.query?._text || "",
      raw?.query || "",
    ],
    [
      "Geselecteerde catalogus",
      "raw.selectedPerspectiveId",
      "/branch/1000/perspective/{perspectiveId}/search",
      "perspectiveId",
      raw?.selectedPerspectiveId || "",
      raw?.selectedPerspectiveId || "",
    ],
    [
      "Geselecteerde scope",
      "raw.selectedSearchScope",
      "/branch/1000/perspective/{perspectiveId}/search",
      "searchScope",
      raw?.selectedSearchScope || "",
      raw?.selectedSearchScope || "",
    ],
    [
      "Geselecteerde sortering",
      "raw.selectedSort",
      "/branch/1000/perspective/{perspectiveId}/search",
      "sort",
      raw?.selectedSort || "",
      raw?.selectedSort || "",
    ],
    [
      "Facet filters",
      "raw.selectedFacetFilters[]",
      "/branch/1000/perspective/{perspectiveId}/search",
      "facetFilter",
      JSON.stringify(raw?.selectedFacetFilters || []),
      JSON.stringify(raw?.selectedFacetFilters || []),
    ],
    [
      "Facetten",
      "raw.searchResponse.facets",
      "/branch/1000/perspective/{perspectiveId}/search",
      "facets/filters/refinements",
      JSON.stringify(raw?.searchResponse?.facets || raw?.searchResponse?.filters || raw?.searchResponse?.refinements || []),
      JSON.stringify(raw?.searchResponse?.facets || raw?.searchResponse?.filters || raw?.searchResponse?.refinements || []),
    ],
    [
      "Resultaat ID",
      "results.result[].id._attributes.nativeid",
      "/branch/1000/perspective/{perspectiveId}/search",
      "id/titleId",
      result?.id?._attributes?.nativeid || "",
      title?.id || "",
    ],
    [
      "Titel",
      "results.result[].titles.title._text",
      "/branch/1000/perspective/{perspectiveId}/search",
      "title",
      result?.titles?.title?._text || "",
      title?.title || "",
    ],
    [
      "Auteur",
      "results.result[].authors.main-author._text",
      "/branch/1000/perspective/{perspectiveId}/search",
      "author.description",
      result?.authors?.["main-author"]?._text || "",
      title?.author?.description || "",
    ],
    [
      "Cover",
      "results.result[].coverimages.coverimage._text",
      "/branch/1000/perspective/{perspectiveId}/search",
      "imageUrls.small/medium/large",
      result?.coverimages?.coverimage?._text || "",
      title?.imageUrls?.small || title?.imageUrls?.medium || title?.imageUrls?.large || "",
    ],
    [
      "Jaar",
      "results.result[].publication.year._text",
      "/branch/1000/perspective/{perspectiveId}/search",
      "publicationYear",
      result?.publication?.year?._text || "",
      title?.publicationYear || "",
    ],
    [
      "Samenvatting",
      "results.result[].summaries.summary._text",
      "/branch/1000/perspective/{perspectiveId}/search",
      "contents",
      result?.summaries?.summary?._text || "",
      title?.contents || "",
    ],
    [
      "Suggesties",
      "suggestions.suggestion[]",
      "/branch/1000/searchsuggestion",
      "suggestions",
      JSON.stringify(asArray(mapped?.suggestions?.suggestion).map((x) => x?._text).filter(Boolean)),
      JSON.stringify(raw?.suggestions || []),
    ],
  ];

  return rows.map(([label, jsonPath, endpoint, oclcField, mappedValue, oclcValue]) => ({
    label: text(label),
    jsonPath: text(jsonPath),
    endpoint: text(endpoint),
    oclcField: text(oclcField),
    mappedValue: text(mappedValue),
    oclcValue: text(oclcValue),
  }));
}

export function toSearchMappingCsv(rows = []) {
  const headers = [
    "OBA zoekpagina",
    "raw json parsed veld",
    "OCLC endpoint",
    "OCLC veld",
    "OCLC waarde",
    "mapped waarde",
  ];

  const escape = (value) => {
    const stringValue = value === null || value === undefined ? "" : String(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  return [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.label,
        row.jsonPath,
        row.endpoint,
        row.oclcField,
        row.oclcValue,
        row.mappedValue,
      ]
        .map(escape)
        .join(",")
    ),
  ].join("\n");
}
