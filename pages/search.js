import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const pretty = (v) => JSON.stringify(v, null, 2);

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;

  const [data, setData] = useState(null);

  useEffect(() => {
    if (!q) return;

    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then(setData);
  }, [q]);

  if (!data) return <div className="container">Loading...</div>;

  const mapped = data.mapped;
  const raw = data.raw;
  const results = mapped?.results?.result || [];

  return (
    <div className="container">

      <h1>Zoekresultaten</h1>

      <p>{mapped.meta.count._text} resultaten</p>

      <div>
        {results.map((item, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <a href={`/item/${item.id._text}`}>
              <strong>{item.titles.title._text}</strong>
            </a>
            <div>{item.authors["main-author"]._text}</div>
            <div>{item.publication.year._text}</div>
          </div>
        ))}
      </div>

      <h2>Debug</h2>

      <details>
        <summary>OCLC API calls</summary>
        <pre>{pretty(raw.debug.calls)}</pre>
      </details>

      <details>
        <summary>Mapped output</summary>
        <pre>{pretty(mapped)}</pre>
      </details>

      <details>
        <summary>Raw output</summary>
        <pre>{pretty(raw)}</pre>
      </details>

    </div>
  );
}
