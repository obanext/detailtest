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

  const title = mapped.titles?.title?._text;
  const author = mapped.authors?.["main-author"]?._text;
  const summary = mapped.summaries?.summary?._text;
  const image = mapped.coverimages?.coverimage?._text;

  const specRows = [
    ["ISBN Nummer", mapped.identifiers?.["isbn-id"]?._text],
    ["PPN Nummer", mapped.identifiers?.["ppn-id"]?._text],
    ["Boekcode", mapped.misc?.bookcode],
    ["Taal publicatie", mapped.languages?.language?._text],
    ["Taal - Originele taal", mapped.languages?.["original-language"]?._text],
    ["Hoofdtitel", title],
    ["Algemene materiaalaanduiding", mapped.misc?.material],
    ["Eerste verantwoordelijke", author],
    ["Titel - Volgende verantwoordelijken", mapped.contributors?.secondary?.lastName],
    ["Plaats van uitgave", mapped.publication?.place?._text],
    ["Uitgever", mapped.publication?.publishers?.publisher?._text],
    ["Jaar van uitgave", mapped.publication?.year?._text],
    ["Pagina's", mapped.description?.pages?._text],
    ["Collatie - Illustraties", mapped.description?.["physical-description"]?._text],
    ["Centimeters", mapped.description?.size?._text],
    ["Annotatie", mapped.annotation?._text],
    ["Serietitel", mapped.series?.title?._text],
    ["Auteur Functie", mapped.contributors?.primary?.role],
    ["Auteur Achternaam", mapped.contributors?.primary?.lastName],
    ["Auteur Voornaam", mapped.contributors?.primary?.firstName],
    ["Trefwoord - Hoofd geleding", mapped.subjects?.["topical-subject"]?.[0]?._text],
    ["SISO - Code", mapped.classification?.siso?._text],
    ["Auteur - secundaire - Functie", mapped.contributors?.secondary?.roles],
    ["Auteur - secundaire - Achternaam", mapped.contributors?.secondary?.lastName],
    ["Auteur - secundaire - Voornaam", mapped.contributors?.secondary?.firstName],
    ["Prod country", mapped.misc?.prodCountry],
    ["Samenvatting - Tekst", mapped.summaries?.summary?._text],
    ["Bestelnummer NBD Nummer", mapped.misc?.nbd]
  ].filter(([, v]) => v);

  const branches = mapped["librarian-info"]?.record?.meta?.branches || [];

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
      <div className="hero">
        <div className="hero-copy">
          <h1 className="title">{title}</h1>
          <div className="author-line">{author}</div>
          <div className="summary-text">{summary}</div>
        </div>

        <div className="hero-cover">
          {image && <img src={image} className="cover-large" />}
        </div>
      </div>

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

      {tab === "availability" ? (
        <section className="table-card">
          <table className="detail-table">
            <tbody>
              {branches.map((b, i) => {
                const f = b.branches;
                return (
                  <tr key={i}>
                    <td>{f.find(x => x._attributes.key === "s")?._text}</td>
                    <td>{f.find(x => x._attributes.key === "m")?._text}</td>
                    <td>{f.find(x => x._attributes.key === "k")?._text}</td>
                    <td>{f.find(x => x._attributes.key === "status")?._text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

      <section className="debug-section">
        <button onClick={download}>Download CSV</button>

        <pre>{JSON.stringify(mapped, null, 2)}</pre>
        <pre>{JSON.stringify(data.raw, null, 2)}</pre>
      </section>
    </div>
  );
}
