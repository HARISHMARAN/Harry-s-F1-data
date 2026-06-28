declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => unknown;
};

export {};

const predictions: never[] = [];

const repoSummary = {
  title: "2026 F1 Predictions",
  description:
    "No pre-generated predictions. Predictions are generated live from OpenF1 session data and Jolpica historical results.",
  sourcePath: "app/api/predictions/forecast",
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
      defaultId: null,
      predictions: [],
    });
  }

  return json({ error: "Prediction not found" }, 404);
});
