const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const text = (v) => (typeof v === "string" ? v.trim() : v || "");

/**
 * Alleen OBA vestigingen
 */
const ALLOWED_BRANCHES = ["1000", "1001", "1002", "1003", "1004"];

/**
 * Hoofd mapper: OCLC → OBA JSON contract
 */
export function mapWiseToObaFull({ title, availability, summary, itemInformation }) {
  if (!title || typeof title !== "object") return {};

  return {
    id: {
      _text: `|oba-catalogus|${text(title.id)}`
    },

    titles: {
      title: {
        _text: text(title.title)
      },
      "short-title": {
        _text: text(title.mainTitle || title.title)
      }
    },

    authors: {
      "main-author": {
        _text: text(title.author?.description)
      }
    },

    formats: {
      format: [
        {
          _text: text(title.media?.description)
        }
      ]
    },

    identifiers: {
      "isbn-id": {
        _text: text(asArray(title.isbn)[0])
      },
      "ppn-id": {
        _text: text(asArray(title.ppn)[0])
      }
    },

    publication: {
      year: {
        _text: text(title.publicationYear)
      },
      publishers: {
        publisher: {
          _text: extractPublisher(title.imprint)
        }
      }
    },

    languages: {
      language: {
        _text: text(asArray(title.language)[0]?.description)
      }
    },

    subjects: {
      "topical-subject": asArray(title.subjects)
        .map((s) => ({ _text: text(s.description) }))
        .filter((s) => s._text)
    },

    description: {
      pages: {
        _text: extractPages(title.annotationCollation)
      },
      "physical-description": {
        _text: text(title.annotationCollation)
      }
    },

    summaries: {
      summary: {
        _text: text(title.contents)
      }
    },

    "target-audiences": {
      "target-audience": {
        _text: title.youth ? "Jeugd" : "Volwassenen"
      }
    },

    coverimages: {
      coverimage: {
        _text: text(title.imageUrls?.medium)
      }
    },

    "librarian-info": {
      record: {
        meta: {
          branches: buildBranches(itemInformation)
        }
      }
    }
  };
}

/**
 * Extract publisher uit imprint
 */
function extractPublisher(imprint = "") {
  const val = text(imprint);
  if (!val.includes(":")) return "";

  const [, rest] = val.split(":");
  return text(rest.split(",")[0]);
}

/**
 * Extract aantal pagina's
 */
function extractPages(collation = "") {
  const val = text(collation);
  const match = val.match(/^(\d+)/);
  return match ? `${match[1]} p` : "";
}

/**
 * Bouw OBA branch structuur (GEFILTERD)
 */
function buildBranches(items = []) {
  return asArray(items)
    .filter((item) =>
      ALLOWED_BRANCHES.includes(String(item.branchId))
    )
    .map((item) => ({
      branches: [
        {
          _attributes: { key: "b" },
          _text: text(item.barcode)
        },
        {
          _attributes: { key: "s" },
          _text: text(item.branchName)
        },
        {
          _attributes: { key: "m" },
          _text: text(item.shelfDescription || item.subLocation)
        },
        {
          _attributes: { key: "k" },
          _text: text(item.callNumber)
        },
        {
          _attributes: { key: "status" },
          _text: mapStatus(item.effectiveStatus)
        }
      ]
    }));
}

/**
 * Status mapping (consistent met frontend)
 */
function mapStatus(status) {
  switch (status) {
    case "AVAILABLE":
      return "Aanwezig";
    case "ON_LOAN":
      return "Uitgeleend";
    case "MISSING":
      return "Niet beschikbaar";
    default:
      return text(status) || "Onbekend";
  }
}
