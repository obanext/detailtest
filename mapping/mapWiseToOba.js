const asArray = (value) => {
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
