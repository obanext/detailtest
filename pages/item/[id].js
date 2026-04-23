import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { diffObjects } from "../../utils/diff";
import { toCSV } from "../../utils/csv";

export default function Page() {
  const { query } = useRouter();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("availability");

  useEffect(() => {
    if (!query.id) return;

    fetch(`/api/wise?id=${query.id}`)
      .then((r) => r.json())
      .then(setData);
  }, [query.id]);

  if (!data) return <div className="container">Loading...</div>;

  const mapped = data.mapped || {};

  // ===== BASIS =====
  const title = mapped.titles?.title?._text || "";
  const subtitle = mapped.titles?.["short-title"]?._text || "";
  const author = mapped.authors?.["main-author"]?._text || "";
  const summary = mapped.summaries?.summary?._text || "";
  const image = mapped.coverimages?.coverimage?._text || "";

  // ===== SPECIFICATIES (DETAIL VIEW) =====
  const specRows = [
    ["ISBN Nummer", mapped.identifiers?.["isbn-id"]?._text],
    ["PPN Nummer", mapped.identifiers?.["ppn-id"]?._text],
    ["Taal publicatie", mapped.languages?.language?._text],
    ["Hoofdtitel", title],
    ["Eerste verantwoordelijke", author],
    ["Plaats van uitgave", ""], // niet direct beschikbaar
    ["Uitgever", mapped.publication?.publishers?.publisher?._text],
    ["Jaar van uitgave", mapped.publication?.year?._text],
    ["Pagina's", mapped.description?.pages?._text],
    ["Collatie - Illustraties", mapped.description?.["physical-description"]?._text],
    ["Samenvatting - Tekst", summary]
  ].filter(([, v]) => v);

  // ===== ONDERWERPEN =====
  const subjects = mapped.subjects?.["topical-subject"] || [];

  // ===== BESCHIKBAARHEID =====
  const branches =
    mapped["librarian-info"]?.record?.meta?.branches || [];

  // ===== DIFF =====
  const diff = diffObjects({}, mapped);

  const download = () => {
    const blob = new Blob([toCSV(diff)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mapping.csv";
    a.click();
  };

  return (
    <div className="container detail-page">
      {/* ===== HERO ===== */}
      <div className="hero">
        <div className="hero-copy">
          <h1 className="title">{title}</h1>

          {subtitle && <div className="subtitle">{subtitle}</div>}

          <div className="author-line">{author}</div>

          <div className="summary-text">{summary}</div>

          <div className="card-grid top-cards">
            <section className="info-card">
              <h2>Specificaties</h2>
              <ul className="plain-list">
                {specRows.slice(0, 4).map(([label, value], i) => (
                  <li key={i}>{value}</li>
                ))}
              </ul>
            </section>

            <section className="info-card">
              <h2>Onderwerpen</h2>
              <ul className="plain-list">
                {subjects.map((s, i) => (
                  <li key={i}>{s._text}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div className="hero-cover">
          {image && (
            <img src={image} className="cover-large" alt={title} />
          )}
        </div>
      </div>

      {/* ===== PRAKTISCHE INFO ===== */}
      <div className="section-header">
        <h2>Praktische informatie</h2>

        <div className="tab-buttons">
          <button
            className={tab === "specs" ? "tab-button active" : "tab-button"}
            onClick={() => setTab("specs")}
          >
            specificaties
          </button>

          <button
            className={tab === "availability" ? "tab-button active" : "tab-button"}
            onClick={() => setTab("availability")}
          >
            beschikbaarheid
          </button>
        </div>
      </div>

      {/* ===== TAB CONTENT ===== */}

      {tab === "availability" ? (
        <section className="table-card">
          <div className="table-wrap">
            <table className="detail-table">
              <thead>
                <tr>
                  <th>Locatie</th>
                  <th>Plaats</th>
                  <th>Signatuur</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 && (
                  <tr>
                    <td colSpan={4}>Geen exemplaren gevonden</td>
                  </tr>
                )}

                {branches.map((b, i) => {
                  const f = b.branches || [];

                  const location = f.find(x => x._attributes.key === "s")?._text;
                  const place = f.find(x => x._attributes.key === "m")?._text;
                  const shelf = f.find(x => x._attributes.key === "k")?._text;
                  const status = f.find(x => x._attributes.key === "status")?._text;

                  return (
                    <tr key={i}>
                      <td>{location}</td>
                      <td>{place}</td>
                      <td>{shelf}</td>
                      <td>{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="specs-list">
          {specRows.map(([label, value], i) => (
            <div className="spec-row" key={i}>
              <div className="spec-label">{label}</div>
              <div className="spec-value">{value}</div>
            </div>
          ))}
        </section>
      )}

      {/* ===== DEBUG ===== */}
      <section className="debug-section">
        <button onClick={download}>Download CSV</button>

        <div className="debug-block">
          <summary>Mapped</summary>
          <pre>{JSON.stringify(mapped, null, 2)}</pre>
        </div>

        <div className="debug-block">
          <summary>Raw</summary>
          <pre>{JSON.stringify(data.raw, null, 2)}</pre>
        </div>

        <div className="debug-block">
          <summary>Diff</summary>
          <pre>{JSON.stringify(diff, null, 2)}</pre>
        </div>
      </section>
    </div>
  );
}
