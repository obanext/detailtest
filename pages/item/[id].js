import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { mapWiseToOba } from "../../mapping/mapWiseToOba";

export default function Page() {
  const router = useRouter();
  const { id, ppn } = router.query;

  const [data, setData] = useState(null);

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

  if (!data) return <div>Loading...</div>;

  return (
    <div className="container">
      <div className="header">
        {data.image ? <img src={data.image} className="cover" alt={data.title} /> : null}
        <div>
          <h1>{data.title}</h1>
          {data.subtitle ? <p>{data.subtitle}</p> : null}
          <p>{data.authorLine}</p>
          <p>
            {[data.publication?.publisher, data.publication?.place, data.publication?.year]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <section>
        <h2>Beschrijving</h2>
        <p>{data.summary}</p>
      </section>

      {data.specs?.length ? (
        <section>
          <h2>Specificaties</h2>
          <ul>
            {data.specs.map((spec, i) => (
              <li key={i}>{spec}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2>Beschikbaarheid</h2>
        <p>
          {data.availabilitySummary?.label} — {data.availabilitySummary?.countText}
        </p>
        {data.practicalRows?.length ? (
          data.practicalRows.map((row) => (
            <div key={row.key} className="availability">
              <strong>{row.location}</strong>
              <div>Status: {row.status}</div>
              {row.place ? <div>Plaats: {row.place}</div> : null}
              {row.shelf ? <div>Kast: {row.shelf}</div> : null}
              {row.edition ? <div>Editie: {row.edition}</div> : null}
            </div>
          ))
        ) : (
          <div className="availability">Geen exemplaarinformatie beschikbaar</div>
        )}
      </section>

      {data.subjects?.length ? (
        <section>
          <h2>Onderwerpen</h2>
          <ul>
            {data.subjects.map((subject, i) => (
              <li key={i}>{subject}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.details?.length ? (
        <section>
          <h2>Details</h2>
          <ul>
            {data.details.map((item, i) => (
              <li key={i}>
                <strong>{item.label}:</strong> {item.value}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
