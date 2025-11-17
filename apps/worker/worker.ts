/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  OCR_SPACE_API_KEY: string;
}

type CostType = "FUEL" | "INSURANCE" | "OTHER";

interface Ride {
  id: string;
  userId: string;
  startKm: number;
  endKm: number | null;
  startedAt: string;
  endedAt: string | null;
}

interface CostEvent {
  id: string;
  userId: string;
  amount: number;
  type: CostType;
  description?: string;
  createdAt: string;
}

interface WearPayment {
  id: string;
  userId: string;
  amount: number;
  createdAt: string;
}

interface AppConfig {
  wearRatePerKm: number;
}

interface State {
  rides: Ride[];
  costs: CostEvent[];
  wearPayments: WearPayment[];
  config: AppConfig;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get("Origin") || "*";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: makeCorsHeaders(origin),
      });
    }

    let response: Response;

    try {
      if (request.method === "GET" && path === "/api/state") {
        response = await handleState(env);
      } else if (request.method === "POST" && path === "/api/rides") {
        response = await handleCreateRide(request, env);
      } else if (request.method === "PUT" && path.startsWith("/api/rides/")) {
        const id = path.split("/").pop()!;
        response = await handleUpdateRide(request, env, id);
      } else if (request.method === "POST" && path === "/api/costs") {
        response = await handleCreateCost(request, env);
      } else if (request.method === "POST" && path === "/api/wear-payments") {
        response = await handleCreateWearPayment(request, env);
      } else if (request.method === "POST" && path === "/api/odometer-ocr") {
        response = await handleOdometerOcr(request, env);
      } else {
        response = new Response("Not found", { status: 404 });
      }
    } catch (err) {
      console.error(err);
      response = new Response("Internal Server Error", { status: 500 });
    }

    // Attach CORS headers
    const headers = new Headers(response.headers);
    const cors = makeCorsHeaders(origin);
    for (const [k, v] of Object.entries(cors)) {
      headers.set(k, v);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

// ---------- ROUTE HANDLERS ----------

async function handleState(env: Env): Promise<Response> {
  const ridesRes = await env.DB.prepare(
    "SELECT id, userId, startKm, endKm, startedAt, endedAt FROM rides"
  ).all<Ride>();

  const costsRes = await env.DB.prepare(
    "SELECT id, userId, amount, type, description, createdAt FROM costs"
  ).all<CostEvent>();

  const wearRes = await env.DB.prepare(
    "SELECT id, userId, amount, createdAt FROM wear_payments"
  ).all<WearPayment>();

  const cfgRes = await env.DB.prepare(
    "SELECT value FROM config WHERE key = 'wearRatePerKm'"
  ).all();

  const cfgRow = (cfgRes.results && cfgRes.results[0]) as
    | { value: string }
    | undefined;

  const wearRatePerKm = cfgRow ? Number(cfgRow.value) : 0.2;

  const state: State = {
    rides: (ridesRes.results as Ride[]) ?? [],
    costs: (costsRes.results as CostEvent[]) ?? [],
    wearPayments: (wearRes.results as WearPayment[]) ?? [],
    config: {
      wearRatePerKm,
    },
  };

  return json(state);
}

async function handleCreateRide(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as {
    id: string;
    userId: string;
    startKm: number;
    startedAt: string;
  };

  await env.DB.prepare(
    "INSERT INTO rides (id, userId, startKm, startedAt) VALUES (?, ?, ?, ?)"
  )
    .bind(body.id, body.userId, body.startKm, body.startedAt)
    .run();

  return json({ ok: true });
}

async function handleUpdateRide(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const body = (await request.json()) as {
    userId: string;
    startKm: number;
    endKm?: number | null;
    startedAt: string;
    endedAt?: string | null;
  };

  await env.DB.prepare(
    "UPDATE rides SET userId = ?, startKm = ?, endKm = ?, startedAt = ?, endedAt = ? WHERE id = ?"
  )
    .bind(
      body.userId,
      body.startKm,
      body.endKm ?? null,
      body.startedAt,
      body.endedAt ?? null,
      id
    )
    .run();

  return json({ ok: true });
}

async function handleCreateCost(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as {
    id: string;
    userId: string;
    amount: number;
    type: CostType;
    description?: string;
    createdAt: string;
  };

  await env.DB.prepare(
    "INSERT INTO costs (id, userId, amount, type, description, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(
      body.id,
      body.userId,
      body.amount,
      body.type,
      body.description ?? null,
      body.createdAt
    )
    .run();

  return json({ ok: true });
}

async function handleCreateWearPayment(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as {
    id: string;
    userId: string;
    amount: number;
    createdAt: string;
  };

  await env.DB.prepare(
    "INSERT INTO wear_payments (id, userId, amount, createdAt) VALUES (?, ?, ?, ?)"
  )
    .bind(body.id, body.userId, body.amount, body.createdAt)
    .run();

  return json({ ok: true });
}

async function handleOdometerOcr(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as {
    imageData?: string; // base64 (WITHOUT data: prefix)
  };

  if (!body.imageData) {
    return json({ error: "imageData missing" }, { status: 400 });
  }

  const apiKey = env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    return json(
      { error: "OCR API key not configured on server" },
      { status: 500 }
    );
  }

  // Build POST form for OCR.Space
  const form = new FormData();
  form.append(
    "base64Image",
    `data:image/jpeg;base64,${body.imageData}`
  );
  form.append("language", "eng");
  form.append("isOverlayRequired", "false");
  form.append("OCREngine", "2");

  const ocrRes = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      apikey: apiKey,
    },
    body: form,
  });

  if (!ocrRes.ok) {
    const txt = await ocrRes.text();
    console.error("OCR.Space error:", ocrRes.status, txt);
    return json(
      { error: "OCR API call failed", status: ocrRes.status },
      { status: 502 }
    );
  }

  const ocrJson = (await ocrRes.json()) as any;
  const parsed = ocrJson.ParsedResults?.[0];
  const fullText: string = parsed?.ParsedText || "";

  if (!fullText) {
    return json(
      { value: null, rawText: "", digitsOnly: "", message: "No text detected" },
      { status: 200 }
    );
  }

  const digitsOnly = fullText.replace(/\D/g, "");

  let candidate: string | null = null;
  if (digitsOnly.length >= 4 && digitsOnly.length <= 7) {
    candidate = digitsOnly;
  } else if (digitsOnly.length > 7) {
    candidate = digitsOnly.slice(-7);
  } else if (digitsOnly.length > 0) {
    candidate = digitsOnly;
  }

  const value =
    candidate && Number.isFinite(Number(candidate))
      ? Number(candidate)
      : null;

  return json(
    {
      value,
      rawText: fullText,
      digitsOnly,
    },
    { status: 200 }
  );
}

// ---------- HELPERS ----------

function makeCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin === "null" ? "*" : origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });
}
