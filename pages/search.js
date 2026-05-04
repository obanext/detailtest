import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { buildSearchMappingRows, toSearchMappingCsv } from "../utils/searchMappingRows";

const pretty = (value) => JSON.stringify(value, null, 2);

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

function idForDetail(result = {}) {
  const detailPage = text(result?.["detail-page"]?._text);

  if (detailPage.startsWith("/item/")) {
    return decodeURIComponent(detailPage.replace("/item/", ""));
  }

  return text(result?.id?._attributes?.nativeid);
}

function resultTitle(result = {}) {
  return text(result?.titles?.title?._text || result?.titles?.["short-title"]?._text);
}

function coverImage(result = {}) {
  return text(result?.coverimages?.coverimage?._text);
}

function subjects(result = {}) {
  return asArray(result?.subjects?.["topical-subject"])
    .map((item) => text(item?._text))
    .filter(Boolean);
}

export default function SearchPage() {
  const router = useRouter();
  const initialQuery = typeof router.query.q === "string" ? router.query.q : "";

  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const page = Number(router.query.page || 1);

  useEffect(() => {
    if (!router.isReady) return;

    const q = typeof router.query.q === "string" ? router.query.q : "";
    setQuery(q);

    if (q) {
      runSearch(q, page);
    }
  }, [router.isReady]);

  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&suggest=1`)
        .then((response) => response.json())
        .then((json) => {
          const values = asArray(json?.suggestions)
            .map((item) =>
              typeof item === "string"
                ? item
                : text(item?.text || item?.value || item?.suggestion || item?.term)
            )
            .filter(Boolean);

          setSuggestions(values);
        })
        .catch(() => setSuggestions([]));
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function runSearch(q, nextPage = 1) {
    const cleaned = text(q);

    if (!cleaned) return;

    setLoading(true);
    setError("");
    setShowSuggestions(false);

    fetch(`/api/search?q=${encodeURIComponent(cleaned)}&page=${encodeURIComponent(nextPage)}&limit=20`)
      .then(async (response) => {
        const json = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(json?.error || `Request failed with status ${response.status}`);
        }

        return json;
      })
      .then((json) => {
        setData(json);

        router.replace(
          `/search?q=${encodeURIComponent(cleaned)}&page=${encodeURIComponent(nextPage)}`,
          undefined,
          { shallow: true }
        );
      })
      .catch((err) => {
        setError(err.message || "Onbekende fout");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function submit(event) {
    event.preventDefault();
    runSearch(query, 1);
  }

  const mapped = data?.mapped || {};
  const raw = data?.raw || {};
  const results = asArray(mapped?.results?.result);
  const calls = asArray(raw?.debug?.calls);

  const csvRows = useMemo(() => buildSearchMappingRows(raw, mapped), [raw, mapped]);

  function downloadCsv() {
    try {
      const csv = toSearchMappingCsv(csvRows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.setAttribute("download", `zoekpagina-mapping-${query || "zoekopdracht"}.csv`);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("CSV download mislukt", downloadError);
      window.alert("CSV download mislukt. Controleer de console.");
    }
  }

  return (
    <div className="page">
      <div className="header-image">
        <img src="/header.JPG" alt="Header" />
      </div>

      <div className="container search-page">
        <section className="search-hero">
          <h1 className="title">Zoeken in de collectie</h1>

          <form className="search-form" onSubmit={submit}>
            <div className="search-input-wrap">
              <input
                className="search-input"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Waar ben je naar op zoek?"
              />

              {showSuggestions && suggestions.length ? (
                <div className="suggestion-box">
                  {suggestions.slice(0, 8).map((suggestion, index) => (
                    <button
                      key={`${suggestion}-${index}`}
                      type="button"
                      className="suggestion-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setQuery(suggestion);
                        runSearch(suggestion, 1);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button type="submit" className="search-button">
              Zoek
            </button>
          </form>
        </section>

        {error ? <div className="search-error">Fout: {error}</div> : null}
        {loading ? <div className="search-loading">Zoeken...</div> : null}

        {data ? (
          <>
            <section className="search-toolbar">
              <div>
                <strong>{text(mapped?.meta?.count?._text) || "0"}</strong> resultaten
                {initialQuery ? ` voor "${text(mapped?.meta?.query?._text)}"` : ""}
              </div>

              <button type="button" className="tab-button" onClick={downloadCsv}>
                Download mapping CSV
              </button>
            </section>

            <section className="search-layout">
              <aside className="search-filters">
                <h2>Verfijn</h2>
                <p>
                  Facetten/sortering worden hier toegevoegd zodra de OCLC-searchresponse daarvoor
                  definitief is vastgelegd.
                </p>
              </aside>

              <main className="search-results">
                {results.length ? (
                  results.map((result, index) => {
                    const detailId = idForDetail(result);
                    const title = resultTitle(result);
                    const image = coverImage(result);
                    const author = text(result?.authors?.["main-author"]?._text);
                    const year = text(result?.publication?.year?._text);
                    const format = asArray(result?.formats?.format)
                      .map((item) => text(item?._text))
                      .filter(Boolean)
                      .join(", ");
                    const summary = text(result?.summaries?.summary?._text);
                    const resultSubjects = subjects(result);

                    return (
                      <article className="search-result-card" key={`${detailId}-${index}`}>
                        <Link href={`/item/${encodeURIComponent(detailId)}`} className="result-cover-link">
                          {image ? (
                            <img src={image} alt={title || "Cover"} className="result-cover" />
                          ) : (
                            <div className="result-cover empty-cover">Geen cover</div>
                          )}
                        </Link>

                        <div className="result-body">
                          <Link href={`/item/${encodeURIComponent(detailId)}`} className="result-title">
                            {title || "Onbekende titel"}
                          </Link>

                          {author ? <div className="result-author">{author}</div> : null}

                          <div className="result-meta-line">
                            {[format, year].filter(Boolean).join(" · ")}
                          </div>

                          {summary ? <p className="result-summary">{summary}</p> : null}

                          {resultSubjects.length ? (
                            <div className="result-tags">
                              {resultSubjects.slice(0, 4).map((subject) => (
                                <span className="result-tag" key={subject}>
                                  {subject}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="info-card">Geen resultaten</div>
                )}
              </main>
            </section>

            <section className="pagination-row">
              <button
                type="button"
                className="tab-button"
                disabled={Number(mapped?.meta?.page?._text || 1) <= 1}
                onClick={() => runSearch(query, Number(mapped?.meta?.page?._text || 1) - 1)}
              >
                vorige
              </button>

              <button
                type="button"
                className="tab-button active"
                disabled={!results.length}
                onClick={() => runSearch(query, Number(mapped?.meta?.page?._text || 1) + 1)}
              >
                volgende
              </button>
            </section>

            <section className="debug-section">
              <details className="debug-block">
                <summary>OCLC API calls</summary>
                <div className="debug-content">
                  {calls.length ? (
                    calls.map((call, index) => (
                      <details className="debug-call" key={`${call?.url || "call"}-${index}`}>
                        <summary>
                          {call?.url || "Onbekende call"} | {call?.status || "?"}
                        </summary>
                        <pre>{pretty(call?.body ?? call)}</pre>
                      </details>
                    ))
                  ) : (
                    <pre>Geen calls beschikbaar</pre>
                  )}
                </div>
              </details>

              <details className="debug-block">
                <summary>Mapped output</summary>
                <div className="debug-content">
                  <pre>{pretty(mapped)}</pre>
                </div>
              </details>

              <details className="debug-block">
                <summary>Raw output</summary>
                <div className="debug-content">
                  <pre>{pretty(raw)}</pre>
                </div>
              </details>

              <details className="debug-block">
                <summary>Mapping rows</summary>
                <div className="debug-content">
                  <pre>{pretty(csvRows)}</pre>
                </div>
              </details>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
