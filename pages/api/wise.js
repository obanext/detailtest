export default async function handler(req, res) {
  const { id, ppn } = req.query;

  const base = "https://bibliotheek-accept1.wise.oclc.org/restapi";

  const headers = {
    Accept: "application/json",
    application: process.env.APPLICATION,
    WISE_KEY: process.env.WISE_KEY
  };

  const getJson = async (url) => {
    const response = await fetch(url, { headers });
    const body = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      url,
      body
    };
  };

  try {
    if (ppn) {
      const debugCalls = [];

      const titleCall = `${base}/discovery/origin/nbcplus/branch/1000/title/${encodeURIComponent(ppn)}`;
      const titleResponse = await getJson(titleCall);
      debugCalls.push({
        label: "titleByPpn",
        url: titleResponse.url,
        status: titleResponse.status,
        ok: titleResponse.ok,
        response: titleResponse.body
      });

      const title = titleResponse.body;

      let wiseId = null;

      const titleIdCall = `${base}/titleid/ppn/${encodeURIComponent(ppn)}`;
      const titleIdResponse = await getJson(titleIdCall);
      debugCalls.push({
        label: "titleIdByPpn",
        url: titleIdResponse.url,
        status: titleIdResponse.status,
        ok: titleIdResponse.ok,
        response: titleIdResponse.body
      });

      if (Array.isArray(titleIdResponse.body) && titleIdResponse.body.length > 0) {
        wiseId =
          titleIdResponse.body[0]?.bibliographicRecordId ||
          titleIdResponse.body[0]?.id ||
          titleIdResponse.body[0]?.titleId ||
          null;
      } else if (titleIdResponse.body?.bibliographicRecordId) {
        wiseId = titleIdResponse.body.bibliographicRecordId;
      } else if (titleIdResponse.body?.id) {
        wiseId = titleIdResponse.body.id;
      } else if (titleIdResponse.body?.titleId) {
        wiseId = titleIdResponse.body.titleId;
      }

      let availability = [];
      let summary = { items: [] };
      let itemInformation = [];

      if (wiseId) {
        const availabilityCall = `${base}/branch/1000/titleavailability/${wiseId}?clientType=PUBLIC`;
        const summaryCall = `${base}/discovery/titlesummary/${wiseId}?addRelatedTitles=true&includeManifestations=true`;
        const itemInformationCall = `${base}/title/${wiseId}/iteminformation`;

        const [availabilityResponse, summaryResponse, itemInformationResponse] = await Promise.all([
          getJson(availabilityCall),
          getJson(summaryCall),
          getJson(itemInformationCall)
        ]);

        debugCalls.push(
          {
            label: "titleAvailabilityByWiseId",
            url: availabilityResponse.url,
            status: availabilityResponse.status,
            ok: availabilityResponse.ok,
            response: availabilityResponse.body
          },
          {
            label: "titleSummaryByWiseId",
            url: summaryResponse.url,
            status: summaryResponse.status,
            ok: summaryResponse.ok,
            response: summaryResponse.body
          },
          {
            label: "itemInformationByWiseId",
            url: itemInformationResponse.url,
            status: itemInformationResponse.status,
            ok: itemInformationResponse.ok,
            response: itemInformationResponse.body
          }
        );

        availability = Array.isArray(availabilityResponse.body) ? availabilityResponse.body : [];
        summary = summaryResponse.body && typeof summaryResponse.body === "object" ? summaryResponse.body : { items: [] };
        itemInformation = Array.isArray(itemInformationResponse.body) ? itemInformationResponse.body : [];
      }

      return res.status(200).json({
        title,
        availability,
        summary,
        itemInformation,
        wiseId,
        source: "ppn",
        debug: {
          query: { ppn },
          calls: debugCalls
        }
      });
    }

    const titleCall = `${base}/discovery/title/${id}`;
    const availabilityCall = `${base}/branch/1000/titleavailability/${id}?clientType=PUBLIC`;
    const summaryCall = `${base}/discovery/titlesummary/${id}?addRelatedTitles=true&includeManifestations=true`;
    const itemInformationCall = `${base}/title/${id}/iteminformation`;

    const [titleResponse, availabilityResponse, summaryResponse, itemInformationResponse] = await Promise.all([
      getJson(titleCall),
      getJson(availabilityCall),
      getJson(summaryCall),
      getJson(itemInformationCall)
    ]);

    res.status(200).json({
      title: titleResponse.body,
      availability: Array.isArray(availabilityResponse.body) ? availabilityResponse.body : [],
      summary: summaryResponse.body && typeof summaryResponse.body === "object" ? summaryResponse.body : { items: [] },
      itemInformation: Array.isArray(itemInformationResponse.body) ? itemInformationResponse.body : [],
      wiseId: id,
      source: "id",
      debug: {
        query: { id },
        calls: [
          {
            label: "titleById",
            url: titleResponse.url,
            status: titleResponse.status,
            ok: titleResponse.ok,
            response: titleResponse.body
          },
          {
            label: "titleAvailabilityById",
            url: availabilityResponse.url,
            status: availabilityResponse.status,
            ok: availabilityResponse.ok,
            response: availabilityResponse.body
          },
          {
            label: "titleSummaryById",
            url: summaryResponse.url,
            status: summaryResponse.status,
            ok: summaryResponse.ok,
            response: summaryResponse.body
          },
          {
            label: "itemInformationById",
            url: itemInformationResponse.url,
            status: itemInformationResponse.status,
            ok: itemInformationResponse.ok,
            response: itemInformationResponse.body
          }
        ]
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
