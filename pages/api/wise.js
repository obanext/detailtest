export default async function handler(req, res) {
  const { id, branchId = "1000" } = req.query;

  const base = "https://bibliotheek-accept1.wise.oclc.org/restapi";

  const headers = {
    Accept: "application/json",
    application: process.env.APPLICATION,
    WISE_KEY: process.env.WISE_KEY
  };

  try {
    const [titleRes, availabilityRes, summaryRes, branchRes] = await Promise.all([
      fetch(`${base}/discovery/title/${id}`, { headers }),
      fetch(
        `${base}/branch/${encodeURIComponent(branchId)}/titleavailability/${id}?clientType=PUBLIC`,
        { headers }
      ),
      fetch(
        `${base}/discovery/titlesummary/${id}?addRelatedTitles=true&includeManifestations=true`,
        { headers }
      ),
      fetch(`${base}/branch/${encodeURIComponent(branchId)}`, { headers })
    ]);

    if (!titleRes.ok) {
      return res.status(titleRes.status).json({ error: "Title ophalen mislukt" });
    }

    if (!availabilityRes.ok) {
      return res.status(availabilityRes.status).json({ error: "Beschikbaarheid ophalen mislukt" });
    }

    const [title, availability, summary, branch] = await Promise.all([
      titleRes.json(),
      availabilityRes.json(),
      summaryRes.ok ? summaryRes.json() : Promise.resolve({ items: [] }),
      branchRes.ok ? branchRes.json() : Promise.resolve(null)
    ]);

    res.status(200).json({ title, availability, summary, branch, selectedBranchId: branchId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
