declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => unknown;
};

export {};

const predictions = [
  {
    id: "prediction1",
    title: "Australian GP Forecast",
    race: "2026 Australian Grand Prix",
    category: "Forecast",
    season: 2026,
    result: {
      headline: "Projected podium: RUS > ANT > HAD",
      winner: "RUS",
      podium: ["RUS", "ANT", "HAD"],
      note: "Fastest qualifying pace in the pack translates into the strongest race projection in this dataset.",
    },
  },
  {
    id: "prediction2",
    title: "Chinese GP Forecast",
    race: "2026 Chinese Grand Prix",
    category: "Forecast",
    season: 2026,
    result: {
      headline: "Projected podium: RUS > LEC > HAM",
      winner: "RUS",
      podium: ["RUS", "LEC", "HAM"],
      note: "The race score leans on Australia carry-over plus China sector pace, favoring RUS at the top.",
    },
  },
  {
    id: "racepace",
    title: "Chinese GP Pace Study",
    race: "2026 Chinese Grand Prix",
    category: "Analysis",
    season: 2026,
    result: {
      headline: "Pace leader: ANT",
      winner: "ANT",
      podium: ["ANT", "RUS", "HAM"],
      note: "Pure pace analysis puts ANT quickest on the combined ultimate-lap baseline.",
    },
  },
] as const;

const repoSummary = {
  title: "2026 F1 Predictions",
  description:
    "A local prediction pack imported from the upstream repository and exposed through the dashboard as a dedicated web page.",
  sourcePath: "addons/2026_f1_predictions",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

Deno.serve((req) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const functionIndex = segments.lastIndexOf("predictions");
  const tail = functionIndex >= 0 ? segments.slice(functionIndex + 1) : [];

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,OPTIONS",
        "access-control-allow-headers": "authorization,apikey,content-type",
      },
    });
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (tail.length === 0) {
    return json({
      repoSummary,
      defaultId: predictions[0]?.id ?? null,
      predictions: predictions.map(({ id, title, race, category, season }) => ({
        id,
        title,
        race,
        category,
        season,
      })),
    });
  }

  if (tail.length === 1) {
    const id = decodeURIComponent(tail[0]);
    const prediction = predictions.find((entry) => entry.id === id);
    if (!prediction) {
      return json({ error: "Prediction not found" }, 404);
    }
    return json(prediction);
  }

  return json({ error: "Not found" }, 404);
});
