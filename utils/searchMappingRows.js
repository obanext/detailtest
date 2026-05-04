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
      "Aantal resultaten",
      "meta.count._text",
      "/titlelist",
      "total/count",
      mapped?.meta?.count?._text || "",
      String(raw?.total || ""),
    ],
    [
      "Zoekterm",
      "meta.query._text",
      "/titlelist",
      "searchTerm",
      mapped?.meta?.query?._text || "",
      raw?.query || "",
    ],
    [
      "Resultaat ID",
      "results.result[].id._attributes.nativeid",
      "/titlelist + /discovery/title/{id}",
      "id",
      result?.id?._attributes?.nativeid || "",
      title?.id || "",
    ],
    [
      "Titel",
      "results.result[].titles.title._text",
      "/discovery/title/{id}",
      "title",
      result?.titles?.title?._text || "",
      title?.title || "",
    ],
    [
      "Auteur",
      "results.result[].authors.main-author._text",
      "/discovery/title/{id}",
      "author.description",
      result?.authors?.["main-author"]?._text || "",
      title?.author?.description || "",
    ],
    [
      "Cover",
      "results.result[].coverimages.coverimage._text",
      "/discovery/title/{id}",
      "imageUrls.small/medium/large",
      result?.coverimages?.coverimage?._text || "",
      title?.imageUrls?.small || title?.imageUrls?.medium || title?.imageUrls?.large || "",
    ],
    [
      "Jaar",
      "results.result[].publication.year._text",
      "/discovery/title/{id}",
      "publicationYear",
      result?.publication?.year?._text || "",
      title?.publicationYear || "",
    ],
    [
      "Samenvatting",
      "results.result[].summaries.summary._text",
      "/discovery/title/{id}",
      "contents",
      result?.summaries?.summary?._text || "",
      title?.contents || "",
    ],
    [
      "Suggesties",
      "suggestions.suggestion[]",
      "/title/catalog/NBC_PLUS/spellcheck",
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
