import { useEffect, useState } from "react";
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
