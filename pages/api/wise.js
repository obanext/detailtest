export default async function handler(req, res) {
  const { id } = req.query;

  const base = "https://bibliotheek-accept1.wise.oclc.org/restapi";

  const headers = {
    Accept: "application/json",
    application: process.env.APPLICATION,
    WISE_KEY: process.env.WISE_KEY,
  };

  try {
    const [title, availability, summary, itemInformation] = await Promise.all([
      fetch(`${base}/discovery/title/${id}`, { headers }).then((r) => r.json()),
      fetch(`${base}/branch/1000/titleavailability/${id}?clientType=PUBLIC`, { headers }).then((r) =>
        r.json()
      ),
      fetch(
        `${base}/discovery/titlesummary/${id}?addRelatedTitles=true&includeManifestations=true`,
        { headers }
      ).then((r) => r.json()),
      fetch(
        `${base}/title/${id}/iteminformation?branchId=1000&branchCatGroups=0,1,2&clientType=PUBLIC`,
        { headers }
      ).then((r) => r.json()),
    ]);

    res.status(200).json({ title, availability, summary, itemInformation });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
