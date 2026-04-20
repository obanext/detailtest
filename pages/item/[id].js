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
}import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { mapWiseToOba } from "../../mapping/mapWiseToOba";

function MetaList({ items }) {
  if (!items?.length) return null;

  return (
    <dl className="metaList">
      {items.map((item) => (
        <div className="metaRow" key={`${item.label}-${item.value}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TagList({ items }) {
  if (!items?.length) return null;

  return (
    <ul className="tagList">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
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

  if (!data) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <div className="header">
        <div className="coverCol">
          {data.image ? <img src={data.imageLarge || data.image} className="cover" alt={data.title} /> : null}
          <div className="flagList">
            {data.flags.map((flag) => (
              <span key={flag} className="flag">
                {flag}
              </span>
            ))}
          </div>
        </div>

        <div className="heroContent">
          <p className="eyebrow">Mockup detailpagina</p>
          <h1>{data.title}</h1>
          {data.subtitle ? <p className="subtitle">{data.subtitle}</p> : null}
          <p className="lead">{data.author}</p>
          <p>{data.imprint}</p>
          <p>{data.mediaType}</p>
          {data.isbn?.length ? <p>ISBN: {data.isbn.join(", ")}</p> : null}
          {data.ppn ? <p>PPN: {data.ppn}</p> : null}
        </div>
      </div>

      <section>
        <h2>Beschrijving</h2>
        {data.summary ? <p>{data.summary}</p> : null}
        {data.schoolSummary ? <p>{data.schoolSummary}</p> : null}
        {data.acquisitionInformation ? <p>{data.acquisitionInformation}</p> : null}
      </section>

      <section>
        <h2>Kerngegevens</h2>
        <MetaList items={data.details} />
      </section>

      <section>
        <h2>Makers</h2>
        <ul className="plainList">
          {data.contributors.map((person) => (
            <li key={`${person.name}-${person.role}`}>
              <strong>{person.name}</strong>
              {person.role ? ` — ${person.role}` : ""}
              {person.qualifier ? ` (${person.qualifier})` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Onderwerpen en genres</h2>
        <h3>Onderwerpen</h3>
        <TagList items={data.subjects} />
        <h3>Genres</h3>
        <TagList items={data.genres} />
      </section>

      <section>
        <h2>Reeks en doelgroep</h2>
        {data.series?.length ? (
          <ul className="plainList">
            {data.series.map((item) => (
              <li key={`${item.title}-${item.number}`}>
                {item.title}
                {item.number ? ` (${item.number})` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p>Geen reeksinformatie beschikbaar.</p>
        )}
      </section>

      <section>
        <h2>Beschikbaarheid</h2>
        <p>Reserveren toegestaan: {data.holdAllowed ? "Ja" : "Nee"}</p>
        {data.availability.length ? (
          <div className="availabilityList">
            {data.availability.map((a) => (
              <div key={`${a.group}-${a.status}-${a.statusCode}`} className="availability">
                <strong>Categorie {a.group}</strong>
                <span>{a.status}</span>
                {a.statusCode ? <code>{a.statusCode}</code> : null}
              </div>
            ))}
          </div>
        ) : (
          <p>Geen beschikbaarheidsinformatie gevonden.</p>
        )}
      </section>

      <section>
        <h2>Andere edities / manifestaties</h2>
        {data.related.length ? (
          <ul className="plainList">
            {data.related.slice(0, 20).map((r) => (
              <li key={r.id}>
                <strong>{r.title}</strong>
                {r.publicationYear ? ` — ${r.publicationYear}` : ""}
                {r.edition ? ` — ${r.edition}` : ""}
                {r.isbn?.length ? ` — ISBN ${r.isbn.join(", ")}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p>Geen andere edities gevonden.</p>
        )}
      </section>

      <section>
        <h2>Identificatie</h2>
        <MetaList items={data.identifiers} />
      </section>

      <section>
        <h2>Brondata</h2>
        <p>
          Deze sectie is bewust toegevoegd zodat de webbouwer en reviewers alle beschikbare OCLC/WISE-data kunnen
          valideren voordat we gaan stylen.
        </p>
        <details>
          <summary>discovery/title</summary>
          <pre>{JSON.stringify(data.raw.title, null, 2)}</pre>
        </details>
        <details>
          <summary>branch/titleavailability</summary>
          <pre>{JSON.stringify(data.raw.availability, null, 2)}</pre>
        </details>
        <details>
          <summary>discovery/titlesummary</summary>
          <pre>{JSON.stringify(data.raw.summary, null, 2)}</pre>
        </details>
      </section>
    </div>
  );
}
