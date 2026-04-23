const asArray = (v) => (!v ? [] : Array.isArray(v) ? v.filter(Boolean) : [v].filter(Boolean));
const text = (v) => (typeof v === "string" ? v.trim() : v || "");
const first = (...vs) =>
  vs.find((v) => (Array.isArray(v) ? v.length : v !== undefined && v !== null && String(v).trim()));
const unique = (xs) => [...new Set(xs.filter(Boolean))];

const AMSTELLAND_BRANCHES = ["1000", "1001", "1002", "1003", "1004"];

const splitImprint = (imp = "") => {
  const cleaned = text(imp);
  if (!cleaned) return { place: "", publisher: "", year: "" };
  const [placePart = "", restPart = ""] = cleaned.split(":");
  const place = text(placePart);
  const rest = text(restPart);
  if (!rest) return { place, publisher: "", year: "" };
  const year = rest.match(/(\d{4})/)?.[1] || "";
  const publisher = text(rest.replace(/,?\s*\d{4}.*/, ""));
  return { place, publisher, year };
};

const parsePhysicalDescription = (val = "") => {
  const cleaned = text(val);
  if (!cleaned) return { pages: "", illustrations: "", size: "", full: "" };
  const [pagesPart = "", rest = ""] = cleaned.split(":");
  const [illusPart = "", sizePart = ""] = rest.split(";");
  return {
    pages: text(pagesPart),
    illustrations: text(illusPart),
    size: text(sizePart),
    full: cleaned,
  };
};

const normalizeContributor = (p, fallback = "") =>
  p
    ? {
        name: p.description || "",
        role: first(p.localizedType, p.addition, p.type, fallback) || "",
        qualifier: p.qualifier || "",
      }
    : null;

const availabilityLabel = (it) => {
  const st = text(it?.effectiveStatus || it?.status);
  const code = text(it?.effectiveStatusCode || it?.statusCode);
  if (st === "AVAILABLE") return "Aanwezig";
  if (st === "ON_LOAN") return "Uitgeleend";
  if (st === "NOT_AVAILABLE" && code === "BU") return "Uitgeleend";
  if (st === "NOT_AVAILABLE") return "Niet beschikbaar";
  return st || "Onbekend";
};

const availabilityTone = (it) => {
  const st = text(it?.effectiveStatus || it?.status);
  const code = text(it?.effectiveStatusCode || it?.statusCode);
  if (st === "AVAILABLE") return "available";
  if (st === "ON_LOAN") return "loaned";
  if (st === "NOT_AVAILABLE" && code === "BU") return "loaned";
  return "unavailable";
};

const buildSpecs = (title, pub, phys) =>
  unique([
    title.media?.description,
    asArray(title.language).map((x) => x.description).join(", "),
    pub.publisher,
    phys.full,
    asArray(title.titleSeries).map((x) => x.description).join(", "),
    title.audience?.description || (title.youth ? "Jeugd" : ""),
  ]).filter(Boolean);

const buildDetails = (title, pub, phys, contributors) => {
  const main = title.author;
  const secondary = asArray(title.collaborators)[0];

  return [
    ["ISBN Nummer", asArray(title.isbn)[0]],
    ["PPN Nummer", asArray(title.ppn)[0]],
    ["Boekcode", asArray(title.signature)[0] || title.localCallNumbers?.[0]],
    [
      "Taal publicatie",
      asArray(title.language)
        .map((x) => `${x.code} (${x.description})`)
        .join(", "),
    ],
    ["Hoofdtitel", title.mainTitle || title.title],
    [
      "Algemene materiaalaanduiding",
      `${title.titleCategory || ""} [${title.media?.description || ""}]`.trim(),
    ],
    ["Eerste verantwoordelijke", main?.description],
    ["Titel - Volgende verantwoordelijken", contributors.slice(1).map((x) => x.name).join(", ")],
    ["Plaats van uitgave", pub.place],
    ["Uitgever", pub.publisher],
    ["Jaar van uitgave", first(title.publicationYear, pub.year)],
    ["Pagina's", phys.pages],
    ["Collatie - Illustraties", phys.illustrations],
    ["Centimeters", phys.size],
    ["Serietitel", asArray(title.titleSeries).map((x) => x.description).join(", ")],
    [
      "Volume",
      asArray(title.titleSeries)
        .map((x) => x.number || x.addition)
        .filter(Boolean)
        .join(", "),
    ],
    ["Auteur Functie", main?.addition],
    ["Auteur Achternaam", main?.description?.split(",")[0]],
    ["Auteur Voornaam", main?.description?.split(",").slice(1).join(",").trim()],
    ["Trefwoord - Hoofd geleding", asArray(title.subjects).map((x) => x.description).join(", ")],
    ["Genre - Code", asArray(title.genre).map((x) => x.description).join(", ")],
    ["Auteur - secundaire - Functie", secondary?.addition],
    ["Auteur - secundaire - Achternaam", secondary?.description?.split(",")[0]],
    [
      "Auteur - secundaire - Voornaam",
      secondary?.description?.split(",").slice(1).join(",").trim(),
    ],
    ["Bestelnummer NBD Nummer", title.libraryRecommendation?.match(/\b(20\d{8})\b/)?.[1]],
    ["Samenvatting - Tekst", first(title.contents, title.contentsSchoolWise)],
    ["Prod country", "dit veld is niet aanwezig"],
    ["Editie", first(title.annotationEdition, title.edition)],
  ]
    .filter(([, v]) => v && String(v).trim())
    .map(([label, value]) => ({ label, value }));
};

export function mapWiseToOba({ title, availability, summary, itemInformation, debug, source, wiseId }) {
  const imprintSource = first(title.imprint, title.publicationDetails, "");
  const pub = splitImprint(imprintSource);
  const phys = parsePhysicalDescription(title.annotationCollation);
  const rel = asArray(summary?.items);
  const currentId = String(title.id || "");
  const currentRec = rel.find((i) => String(i.id) === currentId);

  const contributors = unique(
    [
      normalizeContributor(title.author, "Auteur"),
      ...asArray(title.collaborators).map((p) => normalizeContributor(p)),
    ]
      .filter(Boolean)
      .map((x) => JSON.stringify(x))
  ).map((x) => JSON.parse(x));

  const subjects = unique([
    ...asArray(title.subjects).map((x) => x.description),
    ...asArray(title.subjectSchoolWise).map((x) => x.description),
  ]);

  const specs = buildSpecs(title, pub, phys);

  const itemRows = asArray(itemInformation).filter((i) => AMSTELLAND_BRANCHES.includes(String(i.branchId)));

  const practicalRows = itemRows.slice(0, 50).map((item, idx) => ({
    key: item.id || `${item.branchId}-${idx}`,
    location: item.branchName || item.branchId,
    edition: first(title.annotationEdition, title.edition, currentRec?.edition, ""),
    place: item.subLocation || item.shelfDescription || item.location || "",
    shelf: item.callNumber || item.shelfDescription || "",
    status: availabilityLabel(item),
    tone: availabilityTone(item),
    statusNote: text(item.effectiveStatusCode),
  }));

  const availableCount = itemRows.filter((i) => i.effectiveStatus === "AVAILABLE").length;

  return {
    title: title.title,
    subtitle: title.subtitle || "",
    authorLine: contributors.map((x) => x.name).join(", "),
    summary: first(title.contents, title.contentsSchoolWise, ""),
    image: first(title.imageUrls?.large, title.imageUrls?.medium, title.imageUrls?.small, ""),
    specs,
    subjects,
    publication: pub,
    physical: phys,
    availabilitySummary: {
      label: availableCount > 0 ? "aanwezig" : "niet beschikbaar",
      countText: `In ${practicalRows.length || 1} locaties`,
      holdAllowed: Boolean(availability?.[0]?.holdAllowed || title.allowHolds),
    },
    practicalRows,
    details: buildDetails(title, pub, phys, contributors),
    raw: { title, availability, summary, itemInformation, currentRec, debug, source, wiseId },
  };
}
