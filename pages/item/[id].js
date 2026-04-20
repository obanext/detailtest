import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { mapWiseToOba } from "../../mapping/mapWiseToOba";

function SpecsCard({ title, items }) {
  if (!items?.length) return null;

  return (
    <div className="infoCard">
      <h3>{title}</h3>
      <ul className="checkList">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SubjectCard({ title, items }) {
  if (!items?.length) return null;

  return (
    <div className="infoCard small">
      <h3>{title}</h3>
      <ul className="linkList">
        {items.map((item) => (
          <li key={item}>
            <a href="#">{item}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusPill({ tone, children }) {
  return <span className={`statusPill ${tone}`}>{children}</span>;
}

export default function Page() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/wise?id=${id}`)
      .then((r) => r.json())
      .then((res) => setData(mapWiseToOba(res)));
  }, [id]);

  if (!data) {
    return <div className="pageShell loading">Loading...</div>;
  }

  return (
    <div className="pageShell">
      <header className="siteHeader">
        <img src="/header.JPG" alt="OBA header" className="siteHeaderImage" />
      </header>

      <main className="pageContent">
        <div className="breadcrumbRow">
          <span className="crumb back">← Terug</span>
          <span className="crumb dark">Collectie</span>
          <span className="crumb current">{data.title}</span>
        </div>

        <section className="heroSection">
          <div className="heroText">
            <h1>{data.title}</h1>
            {data.subtitle ? <p className="subtitle">{data.subtitle}</p> : null}

            <button className="shareButton" type="button" aria-label="Delen">
              ↗
            </button>

            <p className="authorLine">
              <a href="#">{data.authorLine}</a>
            </p>

            <p className="summaryText">{data.summary}</p>

            <p className="availabilityIntro">
              <span className="greenDot" />
              <span>
                {data.availabilitySummary.label} {data.availabilitySummary.countText.toLowerCase()}
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
              <SpecsCard title="Specificaties" items={data.specs} />
              <SubjectCard title="Onderwerpen" items={data.subjects} />
            </div>
          </div>

          <div className="heroCoverWrap">
            {data.image ? <img src={data.image} alt={data.title} className="heroCover" /> : null}
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
                {data.practicalRows.map((row) => (
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
            {data.details.map((item) => (
              <div className="detailRow" key={`${item.label}-${item.value}`}>
                <div className="detailLabel">{item.label}</div>
                <div className="detailValue">{item.value}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
