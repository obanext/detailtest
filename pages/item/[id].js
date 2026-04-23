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
    const resolvedPpn = typeof ppn === "string" ? ppn : isPpnRoute ? id.split(":").slice(1).join(":") : null;
    const url = resolvedPpn
      ? `/api/wise?ppn=${encodeURIComponent(resolvedPpn)}`
      : id
        ? `/api/wise?id=${encodeURIComponent(id)}`
        : null;

    if (!url) return;

    fetch(url)
      .then(r => r.json())
      .then(res => setData(mapWiseToOba(res)));
  }, [router.isReady, id, ppn]);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="container">
      <div className="header">
        <img src={data.image} className="cover" />
        <div>
          <h1>{data.title}</h1>
          <p>{data.author}</p>
          <p>{data.imprint}</p>
          <p>ISBN: {data.isbn?.join(", ")}</p>
        </div>
      </div>

      <section>
        <h2>Beschrijving</h2>
        <p>{data.summary}</p>
      </section>

      <section>
        <h2>Beschikbaarheid</h2>
        {data.availability.map((a, i) => (
          <div key={i} className="availability">
            {a.status}
          </div>
        ))}
      </section>

      <section>
        <h2>Andere edities</h2>
        <ul>
          {data.related.slice(0, 10).map((r, i) => (
            <li key={i}>{r.title}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
