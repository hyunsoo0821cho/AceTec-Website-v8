import './supabase_D3svsCwH.mjs';

const GET = async () => {
  const status = {
    server: "ok",
    database: "not configured",
    ai: "checking..."
  };
  try {
    const res = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3e3) });
    status.ai = res.ok ? "ollama ok" : "ollama not responding";
  } catch {
    status.ai = "ollama not reachable";
  }
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
