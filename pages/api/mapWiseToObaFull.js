const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const text = (v) => (typeof v === "string" ? v.trim() : v || "");

export function mapWiseToObaFull({ title, availability, summary, itemInformation }) {
  if (!title) return {};

  return {
    id: {
      _text: `|oba-catalogus|${title.id}`
    },

    titles: {
      title: {
        _text: title.title
      },
      "short-title": {
        _text: title.mainTitle || title.title
      }
    },

    authors: {
      "main-author": {
        _text: title.author?.description
      }
    },

    formats: {
      format: [
        {
          _text: title.media?.description
        }
      ]
    },

    identifiers: {
      "isbn-id": {
        _text: asArray(title.isbn)[0]
      },
      "ppn-id": {
        _text: asArray(title.ppn)[0]
      }
    },

    publication: {
      year: {
        _text: title.publicationYear
      },
      publishers: {
        publisher: {
          _text: extractPublisher(title.imprint)
        }
      }
    },

    languages: {
      language: {
        _text: asArray(title.language)[0]?.description
      }
    },

    subjects: {
      "topical-subject": asArray(title.subjects).map((s) => ({
        _text: s.description
      }))
    },

    description: {
      pages: {
        _text: extractPages(title.annotationCollation)
      },
      "physical-description": {
        _text: title.annotationCollation
      }
    },

    summaries: {
      summary: {
        _text: title.contents
      }
    },

    "target-audiences": {
      "target-audience": {
        _text: title.youth ? "Jeugd" : "Volwassenen"
      }
    },

    coverimages: {
      coverimage: {
        _text: title.imageUrls?.medium
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

function extractPublisher(imprint = "") {
  const parts = imprint.split(":");
  if (parts.length < 2) return "";
  return parts[1].split(",")[0].trim();
}

function extractPages(collation = "") {
  const match = collation.match(/^(\d+)/);
  return match ? `${match[1]} p` : "";
}

function buildBranches(items = []) {
  return items.map((item) => ({
    branches: [
      { _attributes: { key: "b" }, _text: item.barcode },
      { _attributes: { key: "s" }, _text: item.branchName },
      { _attributes: { key: "m" }, _text: item.shelfDescription },
      { _attributes: { key: "k" }, _text: item.callNumber },
      { _attributes: { key: "status" }, _text: mapStatus(item.effectiveStatus) }
    ]
  }));
}

function mapStatus(status) {
  switch (status) {
    case "AVAILABLE": return "Aanwezig";
    case "ON_LOAN": return "Uitgeleend";
    case "MISSING": return "Niet beschikbaar";
    default: return status;
  }
}
