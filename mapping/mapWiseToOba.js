const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
};

const text = (value) => (typeof value === "string" ? value.trim() : value || "");

const first = (...values) =>
  values.find((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && String(value).trim() !== "";
  });

const unique = (items) => [...new Set(items.filter(Boolean))];

const splitImprint = (imprint = "") => {
  const cleaned = text(imprint);
  if (!cleaned) return { place: "", publisher: "", year: "" };

  const [placePart = "", restPart = ""] = cleaned.split(":");
  const place = text(placePart);
  const rest = text(restPart);

  if (!rest) {
    return { place, publisher: "", year: "" };
  }

  const yearMatch = rest.match(/(\d{4})/);
  const year = yearMatch?.[1] || "";
  const publisher = text(rest.replace(/,?\s*\d{4}.*/, ""));

  return { place, publisher, year };
};

const parsePhysicalDescription = (value = "") => {
  const cleaned = text(value);
  if (!cleaned) return { pages: "", illustrations: "", size: "", full: "" };

  const [pagesPart = "", rest = ""] = cleaned.split(":");
  const [illustrationsPart = "", sizePart = ""] = rest.split(";");

  return {
    pages: text(pagesPart),
    illustrations: text(illustrationsPart),
    size: text(sizePart),
    full: cleaned,
  };
};

const normalizeContributor = (person, fallbackRole = "") => {
  if (!person) return null;
  return {
    name: person.description || "",
    role: first(person.localizedType, person.addition, person.type, fallbackRole) || "",
    qualifier: person.qualifier || "",
  };
};

const availabilityLabel = (item) => {
  const status = text(item?.effectiveStatus || item?.status);
  const code = text(item?.effectiveStatusCode || item?.statusCode);

  if (status === "AVAILABLE") return "Aanwezig";
  if (status === "ON_LOAN") return "Uitgeleend";
  if (status === "NOT_AVAILABLE" && code === "BU") return "Uitgeleend";
  if (status === "NOT_AVAILABLE") return "Niet beschikbaar";
  return status || "Onbekend";
};

const availabilityTone = (item) => {
  const status = text(item?.effectiveStatus || item?.status);
  const code = text(item?.effectiveStatusCode || item?.statusCode);

  if (status === "AVAILABLE") return "available";
  if (status === "ON_LOAN") return "loaned";
  if (status === "NOT_AVAILABLE" && code === "BU") return "loaned";
  return "unavailable";
};

const buildSpecs = (title, publication, physical) => {
  return unique([
    title.media?.description,
    asArray(title.language).map((item) => item.description).join(", "),
    publication.publisher,
    physical.full,
    asArray(title.titleSeries).map((item) => item.description).join(", "),
    title.audience?.description || (title.youth ? "Jeugd" : ""),
  ]).filter(Boolean);
};

const buildDetails = (title, publication, physical, contributors) => {
  const mainAuthor = title.author;
  const secondary = asArray(title.collaborators)[0];

  return [
    ["PPN Nummer", asArray(title.ppn)[0]],
    ["Boekcode", asArray(title.signature)[0] || title.localCallNumbers?.[0]],
    [
      "Taal publicatie",
      asArray(title.language)
        .map((item) => `${item.code} (${item.description})`)
        .join(", "),
    ],
    ["Hoofdtitel", title.mainTitle || title.title],
    [
      "Algemene materiaalaanduiding",
      `${title.titleCategory || ""} [${title.media?.description || ""}]`.trim(),
    ],
    ["Eerste verantwoordelijke", mainAuthor?.description],
    [
      "Titel - Volgende verantwoordelijken",
      contributors.slice(1).map((item) => item.name).join(", "),
    ],
    ["Plaats van uitgave", publication.place],
    ["Uitgever", publication.publisher],
    ["Jaar van uitgave", first(title.publicationYear, publication.year)],
    ["Pagina's", physical.pages],
    ["Collatie - Illustraties", physical.illustrations],
    ["Centimeters", physical.size],
    ["Serietitel", asArray(title.titleSeries).map((item) => item.description).join(", ")],
    [
      "Volume",
      asArray(title.titleSeries)
        .map((item) => item.number || item.addition)
        .filter(Boolean)
        .join(", "),
    ],
    ["Auteur Functie", mainAuthor?.addition],
    ["Auteur Achternaam", mainAuthor?.description?.split(",")[0]],
    ["Auteur Voornaam", mainAuthor?.description?.split(",").slice(1).join(",").trim()],
    ["Trefwoord - Hoofd geleding", asArray(title.subjects).map((item) => item.description).join(", ")],
    ["Genre - Code", asArray(title.genre).map((item) => item.description).join(", ")],
    ["Auteur - secundaire - Functie", secondary?.addition],
    ["Auteur - secundaire - Achternaam", secondary?.description?.split(",")[0]],
    ["Auteur - secundaire - Voornaam", secondary?.description?.split(",").slice(1).join(",").trim()],
    ["Bestelnummer NBD Nummer", title.libraryRecommendation?.match(/\b(20\d{8})\b/)?.[1]],
    ["Samenvatting - Tekst", title.contents],
    ["Prod country", "ne"],
    ["Editie", first(title.annotationEdition, title.edition)],
  ]
    .filter(([, value]) => value && String(value).trim() !== "")
    .map(([label, value]) => ({ label, value }));
};

export function mapWiseToOba({ title, availability, summary, itemInformation }) {
  const publication = splitImprint(title.imprint);
  const physical = parsePhysicalDescription(title.annotationCollation);
  const relatedItems = asArray(summary?.items);
  const currentId = String(title.id || "");
  const currentRecord = relatedItems.find((item) => String(item.id) === currentId);

  const contributors = unique(
    [
      normalizeContributor(title.author, "Auteur"),
      ...asArray(title.collaborators).map((person) => normalizeContributor(person)),
    ]
      .filter(Boolean)
      .map((item) => JSON.stringify(item))
  ).map((item) => JSON.parse(item));

  const subjects = unique([
    ...asArray(title.subjects).map((item) => item.description),
    ...asArray(title.subjectSchoolWise).map((item) => item.description),
  ]);

  const specs = buildSpecs(title, publication, physical);
  const availabilityItems = asArray(availability?.[0]?.availability);
  const itemRows = asArray(itemInformation);

  const practicalRowsSource = itemRows.length ? itemRows : availabilityItems;

  const practicalRows = practicalRowsSource.slice(0, 50).map((item, index) => {
    const fallbackAvailability = availabilityItems[index % Math.max(availabilityItems.length, 1)] || {};

    return {
      key: item.id || `${item.branchId || "row"}-${index}`,
      location: item.branchName || item.branchId || "Onbekende locatie",
      edition: first(title.annotationEdition, title.edition, currentRecord?.edition, ""),
      place: item.subLocation || item.shelfDescription || item.location || "",
      shelf: item.callNumber || item.shelfDescription || "",
      status: availabilityLabel(itemRows.length ? item : fallbackAvailability),
      tone: availabilityTone(itemRows.length ? item : fallbackAvailability),
      statusNote: text(item.effectiveStatusCode || fallbackAvailability.statusCode),
    };
  });

  const availableCount = itemRows.length
    ? itemRows.filter((item) => item.effectiveStatus === "AVAILABLE").length
    : availabilityItems.filter((item) => item.status === "AVAILABLE").length;

  return {
    title: title.title,
    subtitle: title.subtitle || "",
    authorLine: contributors.map((item) => item.name).join(", "),
    summary: first(title.contents, title.contentsSchoolWise, ""),
    image: first(title.imageUrls?.large, title.imageUrls?.medium, title.imageUrls?.small, ""),
    specs,
    subjects,
    publication,
    physical,
    availabilitySummary: {
      label: availableCount > 0 ? "aanwezig" : "niet beschikbaar",
      countText: `In ${practicalRows.length || 1} locaties`,
      holdAllowed: Boolean(availability?.[0]?.holdAllowed || title.allowHolds),
    },
    practicalRows,
    details: buildDetails(title, publication, physical, contributors),
    raw: {
      title,
      availability,
      summary,
      itemInformation,
      currentRecord,
    },
  };
}
