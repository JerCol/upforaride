var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-oHJzkc/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// apps/worker/worker.ts
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get("Origin") || "*";
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: makeCorsHeaders(origin)
      });
    }
    let response;
    try {
      if (request.method === "GET" && path === "/api/state") {
        response = await handleState(env);
      } else if (request.method === "POST" && path === "/api/rides") {
        response = await handleCreateRide(request, env);
      } else if (request.method === "PUT" && path.startsWith("/api/rides/")) {
        const id = path.split("/").pop();
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
    const headers = new Headers(response.headers);
    const cors = makeCorsHeaders(origin);
    for (const [k, v] of Object.entries(cors)) {
      headers.set(k, v);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
async function handleState(env) {
  const ridesRes = await env.DB.prepare(
    "SELECT id, userId, participantIds, startKm, endKm, startedAt, endedAt, endLat, endLng FROM rides"
  ).all();
  const costsRes = await env.DB.prepare(
    "SELECT id, userId, amount, type, description, createdAt FROM costs"
  ).all();
  const wearRes = await env.DB.prepare(
    "SELECT id, userId, amount, createdAt FROM wear_payments"
  ).all();
  const cfgRes = await env.DB.prepare(
    "SELECT value FROM config WHERE key = 'wearRatePerKm'"
  ).all();
  const cfgRow = cfgRes.results && cfgRes.results[0];
  const wearRatePerKm = cfgRow ? Number(cfgRow.value) : 0.2;
  const state = {
    rides: ridesRes.results ?? [],
    costs: costsRes.results ?? [],
    wearPayments: wearRes.results ?? [],
    config: {
      wearRatePerKm
    }
  };
  return json(state);
}
__name(handleState, "handleState");
async function handleCreateRide(request, env) {
  const body = await request.json();
  await env.DB.prepare(
    "INSERT INTO rides (id, userId, participantIds, startKm, startedAt) VALUES (?, ?, ?, ?, ?)"
  ).bind(body.id, body.userId, JSON.stringify(body.participantIds), body.startKm, body.startedAt).run();
  return json({ ok: true });
}
__name(handleCreateRide, "handleCreateRide");
async function handleUpdateRide(request, env, id) {
  const body = await request.json();
  await env.DB.prepare(
    "UPDATE rides SET userId = ?, participantIds = ?, startKm = ?, endKm = ?, startedAt = ?, endedAt = ?, endLat = ?, endLng = ? WHERE id = ?"
  ).bind(
    body.userId,
    JSON.stringify(body.participantIds),
    body.startKm,
    body.endKm ?? null,
    body.startedAt,
    body.endedAt ?? null,
    body.endLat ?? null,
    body.endLng ?? null,
    id
  ).run();
  return json({ ok: true });
}
__name(handleUpdateRide, "handleUpdateRide");
async function handleCreateCost(request, env) {
  const body = await request.json();
  await env.DB.prepare(
    "INSERT INTO costs (id, userId, amount, type, description, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(
    body.id,
    body.userId,
    body.amount,
    body.type,
    body.description ?? null,
    body.createdAt
  ).run();
  return json({ ok: true });
}
__name(handleCreateCost, "handleCreateCost");
async function handleCreateWearPayment(request, env) {
  const body = await request.json();
  await env.DB.prepare(
    "INSERT INTO wear_payments (id, userId, amount, createdAt) VALUES (?, ?, ?, ?)"
  ).bind(body.id, body.userId, body.amount, body.createdAt).run();
  return json({ ok: true });
}
__name(handleCreateWearPayment, "handleCreateWearPayment");
async function handleOdometerOcr(request, env) {
  const body = await request.json();
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
      apikey: apiKey
    },
    body: form
  });
  if (!ocrRes.ok) {
    const txt = await ocrRes.text();
    console.error("OCR.Space error:", ocrRes.status, txt);
    return json(
      { error: "OCR API call failed", status: ocrRes.status },
      { status: 502 }
    );
  }
  const ocrJson = await ocrRes.json();
  const parsed = ocrJson.ParsedResults?.[0];
  const fullText = parsed?.ParsedText || "";
  if (!fullText) {
    return json(
      { value: null, rawText: "", digitsOnly: "", message: "No text detected" },
      { status: 200 }
    );
  }
  const digitsOnly = fullText.replace(/\D/g, "");
  let candidate = null;
  if (digitsOnly.length >= 4 && digitsOnly.length <= 7) {
    candidate = digitsOnly;
  } else if (digitsOnly.length > 7) {
    candidate = digitsOnly.slice(-7);
  } else if (digitsOnly.length > 0) {
    candidate = digitsOnly;
  }
  const value = candidate && Number.isFinite(Number(candidate)) ? Number(candidate) : null;
  return json(
    {
      value,
      rawText: fullText,
      digitsOnly
    },
    { status: 200 }
  );
}
__name(handleOdometerOcr, "handleOdometerOcr");
function makeCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === "null" ? "*" : origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}
__name(makeCorsHeaders, "makeCorsHeaders");
function json(body, init) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers || {}
    },
    ...init
  });
}
__name(json, "json");

// ../../.nvm/versions/node/v20.16.0/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-oHJzkc/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = worker_default;

// ../../.nvm/versions/node/v20.16.0/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-oHJzkc/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
