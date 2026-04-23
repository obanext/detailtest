import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { diffObjects } from "../../utils/diff";
import { toCSV } from "../../utils/csv";

export default function Page() {
  const { query } = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!query.id) return;
    fetch(`/api/wise?id=${query.id}`)
      .then((r) => r.json())
      .then(setData);
  }, [query.id]);

  if (!data) return <div>Loading...</div>;

  const diff = diffObjects({}, data.mapped);

  const download = () => {
    const blob = new Blob([toCSV(diff)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mapping.csv";
    a.click();
  };

  return (
    <div className="container">
      <h1>{data.mapped.titles?.title?._text}</h1>

      <button onClick={download}>Download CSV</button>

      <h3>Mapped</h3>
      <pre>{JSON.stringify(data.mapped, null, 2)}</pre>

      <h3>Raw</h3>
      <pre>{JSON.stringify(data.raw, null, 2)}</pre>

      <h3>Diff</h3>
      <pre>{JSON.stringify(diff, null, 2)}</pre>
    </div>
  );
}
