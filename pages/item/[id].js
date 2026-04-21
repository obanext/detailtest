import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { mapWiseToOba } from "../../mapping/mapWiseToOba";

const SpecsCard = ({ title, items }) =>
  items?.length ? (
    <div className="infoCard">
      <h3>{title}</h3>
      <ul className="checkList">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  ) : null;

const SubjectCard = ({ title, items }) =>
  items?.length ? (
    <div className="infoCard small">
      <h3>{title}</h3>
      <ul className="linkList">
        {items.map((t) => (
          <li key={t}>
            <a href="#">{t}</a>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

const StatusPill = ({ tone, children }) => (
  <span className={`statusPill ${tone}`}>{children}</span>
);

export default function Page() {
  const { query } = useRouter();
  const { id } = query;
  const [view, setView] = useState(null);
  const [raw, setRaw] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/wise?id=${id}`)
      .then((r) => r.json())
      .then((res) => {
        setRaw(res);
        setView(mapWiseToOba(res));
      });
  }, [id]);

  if (!view) return <div className="pageShell loading">Loading…</div>;

  const base = "https://bibliotheek-accept1.wise.oclc.org/restapi";
  const calls = [
    { label: "discovery title", url: `${base}/discovery/title/${id}`, payload: raw?.title },
    {
      label: "title availability (1000)",
      url: `${base}/branch/1000/titleavailability/${id}?clientType=PUBLIC`,
      payload: raw?.availability,
    },
    {
      label: "discovery titlesummary",
      url: `${base}/discovery/titlesummary/${id}?addRelatedTitles=true&includeManifestations=true`,
      payload: raw?.summary,
    },
    {
      label: "item information",
      url: `${base}/title/${id}/iteminformation`,
      payload: raw?.itemInformation,
    },
  ];

  return (
    <div className="pageShell">
      <header className="siteHeader">
        <img src="/header.JPG" alt="OBA header" className="siteHeaderImage" />
      </header>

      <main className="pageContent">
        <div className="breadcrumbRow">
          <span className="crumb back">← Terug</span>
          <span className="crumb dark">Collectie</span>
          <span className="crumb current">{view.title}</span>
        </div>

        <section className="heroSection">
          <div className="heroText">
            <h1>{view.title}</h1>
            {view.subtitle ? <p className="subtitle">{view.subtitle}</p> : null}

            <button className="shareButton" type="button" aria-label="Delen">
              ↗
            </button>

            <p className="authorLine">
              <a href="#">{view.authorLine}</a>
            </p>

            <p className="summaryText">{view.summary}</p>

            <p className="availabilityIntro">
              <span className="greenDot" />
              <span>
                {view.availabilitySummary.label}{" "}
                {view.availabilitySummary.countText.toLowerCase()}
              </span>
            </p>

            <div className="ctaRow">
              <button className="iconButton red" type="button" aria-label="Openen">
                ↗
              </button>
              <button className="primaryButton" type="button">
                Reserveer
              </button>
              <button className="secondaryButton" type="button">
                waar te vinden
              </button>
            </div>

            <div className="cardsRow">
              <SpecsCard title="Specificaties" items={view.specs} />
              <SubjectCard title="Onderwerpen" items={view.subjects} />
            </div>
          </div>

          <div className="heroCoverWrap">
            {view.image ? <img src={view.image} alt={view.title} className="heroCover" /> : null}
          </div>
        </section>

        <section className="practicalSection">
          <div className="sectionTop">
            <h2>Praktische informatie</h2>
            <div className="tabRow">
              <button className="tabButton" type="button">
                specificaties
              </button>
              <button className="tabButton active" type="button">
                ✓ beschikbaarheid
              </button>
            </div>
          </div>

          <div className="availabilityTableWrap">
            <table className="availabilityTable">
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
                {view.practicalRows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.location}</td>
                    <td>{row.edition}</td>
                    <td>{row.place}</td>
                    <td>{row.shelf}</td>
                    <td>
                      <StatusPill tone={row.tone}>{row.status}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="detailsSection">
          <h2>Specificaties</h2>
          <div className="detailsList">
            {view.details.map((d) => (
              <div className="detailRow" key={`${d.label}-${d.value}`}>
                <div className="detailLabel">{d.label}</div>
                <div className="detailValue">{d.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rawSection">
          <h2>OCLC-calls & raw output</h2>
          {calls.map((c) => (
            <details key={c.label} className="rawDetails">
              <summary>
                {c.label}: {c.url}
              </summary>
              <pre className="rawBlock">{JSON.stringify(c.payload, null, 2)}</pre>
            </details>
          ))}
        </section>
      </main>
    </div>
  );
}
