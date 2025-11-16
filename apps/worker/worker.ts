/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
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

interface State {
  rides: Ride[];
  costs: CostEvent[];
  wearPayments: WearPayment[];
  config: {
    wearRatePerKm: number;
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (req.method === "GET" && path === "/api/state")
        return handleState(env);

      if (req.method === "POST" && path === "/api/rides")
        return handleCreateRide(req, env);

      if (req.method === "PUT" && path.startsWith("/api/rides/")) {
        const id = path.split("/").pop()!;
        return handleUpdateRide(req, env, id);
      }

      if (req.method === "POST" && path === "/api/costs")
        return handleCreateCost(req, env);

      if (req.method === "POST" && path === "/api/wear-payments")
        return handleCreateWearPayment(req, env);

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error(err);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

// ----------------- HANDLERS -----------------

async function handleState(env: Env): Promise<Response> {
  const rides = await env.DB.prepare(
    "SELECT * FROM rides"
  ).all<Ride>();

  const costs = await env.DB.prepare(
    "SELECT * FROM costs"
  ).all<CostEvent>();

  const wearPayments = await env.DB.prepare(
    "SELECT * FROM wear_payments"
  ).all<WearPayment>();

  const cfg = await env.DB
    .prepare("SELECT value FROM config WHERE key='wearRatePerKm'")
    .all();

  const configRow = cfg.results?.[0] as { value: string } | undefined;
  const wearRatePerKm = configRow ? Number(configRow.value) : 0.2;

  return json({
    rides: rides.results ?? [],
    costs: costs.results ?? [],
    wearPayments: wearPayments.results ?? [],
    config: { wearRatePerKm }
  });
}

async function handleCreateRide(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as {
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
  req: Request,
  env: Env,
  id: string
): Promise<Response> {
  const body = (await req.json()) as any;

  await env.DB.prepare(
    "UPDATE rides SET userId=?, startKm=?, endKm=?, startedAt=?, endedAt=? WHERE id=?"
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

async function handleCreateCost(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as CostEvent;

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
  req: Request,
  env: Env
): Promise<Response> {
  const body = (await req.json()) as WearPayment;

  await env.DB.prepare(
    "INSERT INTO wear_payments (id, userId, amount, createdAt) VALUES (?, ?, ?, ?)"
  )
    .bind(body.id, body.userId, body.amount, body.createdAt)
    .run();

  return json({ ok: true });
}

// ----------------- UTIL -----------------

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
}
