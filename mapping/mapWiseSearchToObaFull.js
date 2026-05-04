const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const text = (v) => (typeof v === "string" ? v.trim() : v || "");

export function mapWiseSearchToObaFull({ query, total, titles }) {
  return {
    meta: {
      count: { _text: String(total || 0) },
      query: { _text: text(query) }
    },

    results: {
      result: asArray(titles).map((entry) => {
        const title = entry?.title || {};

        return {
          id: {
            _text: text(title.id)
          },

          titles: {
            title: { _text: text(title.title) }
          },

          authors: {
            "main-author": {
              _text: text(title.author?.description)
            }
          },

          coverimages: {
            coverimage: {
              _text: text(title.imageUrls?.medium)
            }
          },

          publication: {
            year: {
              _text: text(title.publicationYear)
            }
          },

          summaries: {
            summary: {
              _text: text(title.contents)
            }
          }
        };
      })
    }
  };
}
