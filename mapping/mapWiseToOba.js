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
  const status = text(item?.status);
  const code = text(item?.statusCode);

  if (status === "AVAILABLE") return "Aanwezig";
  if (status === "NOT_AVAILABLE" && code === "BU") return "Uitgeleend";
  if (status === "NOT_AVAILABLE") return "Niet beschikbaar";
  return status || "Onbekend";
};

const availabilityTone = (item) => {
  const status = text(item?.status);
  const code = text(item?.statusCode);

  if (status === "AVAILABLE") return "available";
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

export function mapWiseToOba({ title, availability, summary }) {
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
  const firstAvailability = availabilityItems[0];

  const practicalRows = (relatedItems.length ? relatedItems : [title]).slice(0, 6).map((item, index) => {
    const itemAvailability =
      availabilityItems[index % Math.max(availabilityItems.length, 1)] || firstAvailability || {};

    return {
      key: item.id || `${item.title}-${index}`,
      location: "OBA collectie",
      edition: first(item.edition, title.annotationEdition, title.edition, publication.publisher),
      place: first(
        publication.place && publication.publisher ? `${publication.place} / ${publication.publisher}` : "",
        title.imprint
      ),
      shelf: first(
        asArray(title.titleSeries).map((series) => series.description).filter(Boolean).join(" / "),
        title.readingLevel,
        title.audience?.description,
        "Collectie"
      ),
      status: availabilityLabel(itemAvailability),
      tone: availabilityTone(itemAvailability),
      statusNote: itemAvailability?.statusCode ? `${itemAvailability.statusCode}` : "",
    };
  });

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
      label: availabilityItems.some((item) => item.status === "AVAILABLE") ? "aanwezig" : "niet beschikbaar",
      countText: `In ${availabilityItems.length || 1} locaties`,
      holdAllowed: Boolean(availability?.[0]?.holdAllowed || title.allowHolds),
    },
    practicalRows,
    details: buildDetails(title, publication, physical, contributors),
    raw: {
      title,
      availability,
      summary,
      currentRecord,
    },
  };
}const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
};

const nonEmpty = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const joinName = (person) => {
  if (!person) return "";
  return person.description || [person.firstname, person.preposition, person.lastname].filter(Boolean).join(" ");
};

const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeContributor = (person, fallbackRole = "") => ({
  name: joinName(person),
  role: person?.localizedType || person?.type || person?.addition || fallbackRole,
  qualifier: person?.qualifier || "",
  raw: person,
});

const buildDetails = (title, availability) => {
  const ppn = availability?.[0]?.ppn || asArray(title.ppn)[0] || "";

  return [
    ["Titel", title.title],
    ["Hoofdtitel", title.mainTitle],
    ["Ondertitel", title.subtitle],
    ["Formaat", title.media?.description],
    ["Uitgave", title.annotationEdition || title.edition],
    ["Verschenen", title.publicationYear],
    ["Imprint", title.imprint],
    ["Fysieke beschrijving", title.annotationCollation],
    ["ISBN", asArray(title.isbn).join(", ")],
    ["PPN", ppn],
    ["cWiseId", title.cWiseId],
    ["Leeftijd", title.audience?.description],
    ["Leeftijdsrange", title.ageRange ? `${title.ageRange.from ?? "?"}–${title.ageRange.to ?? "?"} jaar` : ""],
    ["Leesniveau", title.readingLevel],
    ["Jeugdmateriaal", title.youthMaterial?.description],
    ["Doelgroepcode", title.targetGroup],
    ["Scat jeugd", title.scatYouth],
    ["Taal", asArray(title.language).map((item) => item.description).join(", ")],
    ["Front catalog", title.frontCatalog ? "Ja" : "Nee"],
    ["Reserveren toegestaan", title.allowHolds || availability?.[0]?.holdAllowed ? "Ja" : "Nee"],
    ["Bron", title.origin],
  ]
    .filter(([, value]) => nonEmpty(value))
    .map(([label, value]) => ({ label, value }));
};

export function mapWiseToOba({ title, availability, summary }) {
  const relatedItems = asArray(summary?.items);
  const currentId = String(title?.id || "");
  const currentSummaryRecord = relatedItems.find((item) => String(item.id) === currentId);
  const otherEditions = relatedItems.filter((item) => String(item.id) !== currentId);

  const contributors = uniqueBy(
    [
      normalizeContributor(title.author, "Auteur"),
      ...asArray(title.collaborators).map((person) => normalizeContributor(person)),
    ].filter((item) => item.name),
    (item) => `${item.name}-${item.role}`
  );

  const subjects = uniqueBy(
    [
      ...asArray(title.subjects).map((item) => item.description),
      ...asArray(title.subjectSchoolWise).map((item) => item.description),
    ].filter(nonEmpty),
    (item) => item
  );

  const genres = uniqueBy(
    [...asArray(title.genre).map((item) => item.description)].filter(nonEmpty),
    (item) => item
  );

  const series = asArray(title.titleSeries).map((item) => ({
    title: item.description,
    number: item.number || item.addition || "",
  }));

  const availabilityGroups = asArray(availability?.[0]?.availability).map((item) => ({
    group: item.catGroup,
    status: item.status,
    statusCode: item.statusCode,
  }));

  return {
    title: title.title,
    shortTitle: title.mainTitle || title.title,
    subtitle: title.subtitle,
    author: title.author?.description,
    imprint: title.imprint,
    isbn: asArray(title.isbn),
    ppn: availability?.[0]?.ppn || asArray(title.ppn)[0] || "",
    summary: title.contents,
    schoolSummary: title.contentsSchoolWise,
    acquisitionInformation: title.acquisitionInformation,
    image: title.imageUrls?.medium || title.imageUrls?.large || title.imageUrls?.small,
    imageLarge: title.imageUrls?.large || title.imageUrls?.medium,
    mediaType: title.media?.description,
    publicationYear: title.publicationYear,
    edition: title.annotationEdition || title.edition,
    physicalDescription: title.annotationCollation,
    languages: asArray(title.language).map((item) => item.description),
    audience: title.audience?.description,
    ageRange: title.ageRange,
    readingLevel: title.readingLevel,
    youthMaterial: title.youthMaterial?.description,
    targetGroup: title.targetGroup,
    contributors,
    subjects,
    genres,
    series,
    availability: availabilityGroups,
    holdAllowed: Boolean(availability?.[0]?.holdAllowed || title.allowHolds),
    related: otherEditions,
    manifestations: relatedItems,
    details: buildDetails(title, availability),
    flags: [
      title.youth ? "Jeugd" : null,
      title.adult ? "Volwassenen" : null,
      title.narrative ? "Verhalend" : null,
      title.informative ? "Informatief" : null,
      title.available ? "Beschikbaar in collectie" : null,
    ].filter(Boolean),
    identifiers: [
      { label: "Titel-ID", value: title.id },
      { label: "cWiseId", value: title.cWiseId },
      { label: "FRBR-key", value: currentSummaryRecord?.frbrkey || title.frbrkey },
      { label: "PPN", value: availability?.[0]?.ppn || asArray(title.ppn)[0] },
      { label: "ISBN", value: asArray(title.isbn).join(", ") },
    ].filter((item) => nonEmpty(item.value)),
    raw: {
      title,
      availability,
      summary,
    },
  };
}
