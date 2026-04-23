import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { mapWiseToOba } from "../../mapping/mapWiseToOba";

const pretty = (v) => JSON.stringify(v, null, 2);

export default function Page() {
  const router = useRouter();
  const { id, ppn } = router.query;

  const [data, setData] = useState(null);
  const [tab, setTab] = useState("availability");

  useEffect(() => {
    if (!router.isReady) return;

    const isPpnRoute = typeof id === "string" && id.toUpperCase().startsWith("PPN:");
    const resolvedPpn =
      typeof ppn === "string" ? ppn : isPpnRoute ? id.split(":").slice(1).join(":") : null;

    const url = resolvedPpn
      ? `/api/wise?ppn=${encodeURIComponent(resolvedPpn)}`
      : id
        ? `/api/wise?id=${encodeURIComponent(id)}`
        : null;

    if (!url) return;

    fetch(url)
      .then((r) => r.json())
      .then((res) => setData(mapWiseToOba(res)));
  }, [router.isReady, id, ppn]);

  const calls = useMemo(() => data?.raw?.debug?.calls || [], [data]);

  if (!data) return <div className="container">Loading...</div>;

  return (
    <div className="page">
      <div className="container detail-page">
        <div className="hero">
          <div className="hero-copy">
            <div className="pill-row">
              <span className="pill">Collectie</span>
              {data.raw?.source ? <span className="pill muted">{data.raw.source}</span> : null}
              {data.raw?.wiseId ? <span className="pill muted">wiseId {data.raw.wiseId}</span> : null}
            </div>

            <h1 className="title">{data.title}</h1>
            {data.subtitle ? <div className="subtitle">{data.subtitle}</div> : null}

            <div className="author-line">{data.authorLine}</div>
            <div className="summary-text">{data.summary}</div>

            <div className="availability-inline">
              <span className={`dot ${data.availabilitySummary?.label === "aanwezig" ? "available" : "unavailable"}`} />
              <span>
                {data.availabilitySummary?.label} {data.availabilitySummary?.countText ? `| ${data.availabilitySummary.countText}` : ""}
              </span>
            </div>

            <div className="card-grid top-cards">
              <section className="info-card">
                <h2>Specificaties</h2>
                <ul className="plain-list">
                  {data.specs.map((spec, i) => (
                    <li key={i}>{spec}</li>
                  ))}
                </ul>
              </section>

              <section className="info-card">
                <h2>Onderwerpen</h2>
                <ul className="plain-list">
                  {data.subjects.map((subject, i) => (
                    <li key={i}>{subject}</li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <div className="hero-cover">
            {data.image ? <img src={data.image} className="cover-large" alt={data.title} /> : null}
          </div>
        </div>

        <div className="section-header">
          <h2>Praktische informatie</h2>
          <div className="tab-buttons">
            <button
              type="button"
              className={tab === "specs" ? "tab-button" : "tab-button active"}
              onClick={() => setTab("availability")}
            >
              beschikbaarheid
            </button>
            <button
              type="button"
              className={tab === "availability" ? "tab-button" : "tab-button active"}
              onClick={() => setTab("specs")}
            >
              specificaties
            </button>
          </div>
        </div>

        {tab === "availability" ? (
          <section className="table-card">
            <div className="table-wrap">
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>Locatie</th>
                    <th>Uitgave</th>
                    <th>Plaats</th>
                    <th>Waar te vinden</th>
                    <th>Beschikbaarheid</th>
                  </tr>
                </thead>
                <tbody>
                  {data.practicalRows.length ? (
                    data.practicalRows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.location}</td>
                        <td>{row.edition}</td>
                        <td>{row.place}</td>
                        <td>{row.shelf}</td>
                        <td>
                          <span className={`status-badge ${row.tone}`}>{row.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>Geen exemplaarinformatie beschikbaar</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="specs-list">
            {data.details.map((item, i) => (
              <div className="spec-row" key={i}>
                <div className="spec-label">{item.label}</div>
                <div className="spec-value">{item.value}</div>
              </div>
            ))}
          </section>
        )}

        <section className="debug-section">
          <h2>Ruwe output</h2>

          <details className="debug-block" open>
            <summary>Calls</summary>
            <div className="debug-content">
              {calls.map((call, i) => (
                <details className="debug-call" key={i}>
                  <summary>{call.label} | {call.status} | {call.url}</summary>
                  <pre>{pretty(call.response)}</pre>
                </details>
              ))}
            </div>
          </details>

          <details className="debug-block">
            <summary>Mapped output</summary>
            <div className="debug-content">
              <pre>{pretty(data)}</pre>
            </div>
          </details>

          <details className="debug-block">
            <summary>Raw title</summary>
            <div className="debug-content">
              <pre>{pretty(data.raw?.title)}</pre>
            </div>
          </details>

          <details className="debug-block">
            <summary>Raw availability</summary>
            <div className="debug-content">
              <pre>{pretty(data.raw?.availability)}</pre>
            </div>
          </details>

          <details className="debug-block">
            <summary>Raw summary</summary>
            <div className="debug-content">
              <pre>{pretty(data.raw?.summary)}</pre>
            </div>
          </details>

          <details className="debug-block">
            <summary>Raw itemInformation</summary>
            <div className="debug-content">
              <pre>{pretty(data.raw?.itemInformation)}</pre>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
