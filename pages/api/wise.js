export default async function handler(req, res) {
  const { id, ppn } = req.query;

  const base = "https://bibliotheek-accept1.wise.oclc.org/restapi";

  const headers = {
    Accept: "application/json",
    application: process.env.APPLICATION,
    WISE_KEY: process.env.WISE_KEY
  };

  try {
    if (ppn) {
      const title = await fetch(`${base}/discovery/origin/nbcplus/branch/1000/title/${encodeURIComponent(ppn)}`, { headers }).then(r => r.json());

      let wiseId = null;

      try {
        const titleIdResponse = await fetch(`${base}/titleid/ppn/${encodeURIComponent(ppn)}`, { headers }).then(r => r.json());

        if (Array.isArray(titleIdResponse) && titleIdResponse.length > 0) {
          wiseId = titleIdResponse[0]?.bibliographicRecordId || titleIdResponse[0]?.id || null;
        } else if (titleIdResponse?.bibliographicRecordId) {
          wiseId = titleIdResponse.bibliographicRecordId;
        } else if (titleIdResponse?.id) {
          wiseId = titleIdResponse.id;
        }
      } catch (_) {
        wiseId = null;
      }

      let availability = [];
      let summary = { items: [] };

      if (wiseId) {
        const [availabilityResponse, summaryResponse] = await Promise.all([
          fetch(`${base}/branch/1000/titleavailability/${wiseId}?clientType=PUBLIC`, { headers }).then(r => r.json()),
          fetch(`${base}/discovery/titlesummary/${wiseId}?addRelatedTitles=true&includeManifestations=true`, { headers }).then(r => r.json())
        ]);

        availability = availabilityResponse;
        summary = summaryResponse;
      }

      return res.status(200).json({ title, availability, summary, wiseId, source: "ppn" });
    }

    const [title, availability, summary] = await Promise.all([
      fetch(`${base}/discovery/title/${id}`, { headers }).then(r => r.json()),
      fetch(`${base}/branch/1000/titleavailability/${id}?clientType=PUBLIC`, { headers }).then(r => r.json()),
      fetch(`${base}/discovery/titlesummary/${id}?addRelatedTitles=true&includeManifestations=true`, { headers }).then(r => r.json())
    ]);

    res.status(200).json({ title, availability, summary, wiseId: id, source: "id" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
