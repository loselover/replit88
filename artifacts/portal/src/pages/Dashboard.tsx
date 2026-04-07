import { useState, useEffect, useCallback } from "react";

const BASE_URL = window.location.origin;

const MODELS = [
  { id: "gpt-5.2", provider: "OpenAI", description: "Most capable general-purpose model" },
  { id: "gpt-5.1", provider: "OpenAI", description: "Strong general-purpose model" },
  { id: "gpt-5", provider: "OpenAI", description: "General-purpose model" },
  { id: "gpt-5-mini", provider: "OpenAI", description: "Cost effective model for high-volume tasks" },
  { id: "o4-mini", provider: "OpenAI", description: "Thinking model for complex reasoning" },
  { id: "o3", provider: "OpenAI", description: "Thinking model, slower but more capable" },
  { id: "claude-opus-4-6", provider: "Anthropic", description: "Most capable Anthropic model" },
  { id: "claude-sonnet-4-6", provider: "Anthropic", description: "Balanced performance and speed" },
  { id: "claude-haiku-4-5", provider: "Anthropic", description: "Fastest Anthropic model" },
];

const ENDPOINTS = [
  {
    method: "GET",
    path: "/v1/models",
    description: "List all available models",
    compatibility: "OpenAI Compatible",
  },
  {
    method: "POST",
    path: "/v1/chat/completions",
    description: "Create chat completion (routes to OpenAI or Anthropic based on model)",
    compatibility: "OpenAI Compatible",
  },
  {
    method: "POST",
    path: "/v1/messages",
    description: "Create message (Anthropic native format, also routes GPT models)",
    compatibility: "Anthropic Compatible",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="ml-2 px-2 py-1 text-xs rounded bg-secondary hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function HealthIndicator() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    fetch(`${BASE_URL}/api/healthz`)
      .then((r) => r.json())
      .then((data) => setStatus(data.status === "ok" ? "online" : "offline"))
      .catch(() => setStatus("offline"));

    const interval = setInterval(() => {
      fetch(`${BASE_URL}/api/healthz`)
        .then((r) => r.json())
        .then((data) => setStatus(data.status === "ok" ? "online" : "offline"))
        .catch(() => setStatus("offline"));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2.5 h-2.5 rounded-full ${
          status === "online"
            ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
            : status === "offline"
            ? "bg-red-500"
            : "bg-yellow-500 animate-pulse"
        }`}
      />
      <span className="text-sm text-muted-foreground capitalize">{status}</span>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    POST: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    PUT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-mono font-semibold rounded border ${colors[method] || "bg-gray-500/15 text-gray-400"}`}>
      {method}
    </span>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const isOpenAI = provider === "OpenAI";
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded ${
        isOpenAI
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-orange-500/15 text-orange-400"
      }`}
    >
      {provider}
    </span>
  );
}

export default function Dashboard() {
  const curlChat = `curl ${BASE_URL}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "gpt-5.2",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

  const curlMessages = `curl ${BASE_URL}/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold tracking-tight">AI API Gateway</h1>
            <HealthIndicator />
          </div>
          <p className="text-muted-foreground text-lg">
            Unified reverse proxy for OpenAI and Anthropic models. One endpoint, all models.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Connection</h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Base URL</span>
              <div className="flex items-center mt-1">
                <code className="bg-secondary px-3 py-1.5 rounded font-mono text-sm text-foreground flex-1">
                  {BASE_URL}/v1
                </code>
                <CopyButton text={`${BASE_URL}/v1`} />
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Authentication</span>
              <div className="flex items-center mt-1">
                <code className="bg-secondary px-3 py-1.5 rounded font-mono text-sm text-foreground flex-1">
                  Authorization: Bearer YOUR_API_KEY
                </code>
                <CopyButton text="Authorization: Bearer YOUR_API_KEY" />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Endpoints</h2>
          <div className="space-y-3">
            {ENDPOINTS.map((ep) => (
              <div
                key={ep.path}
                className="bg-card border border-border rounded-lg p-4 flex items-start gap-4"
              >
                <MethodBadge method={ep.method} />
                <div className="flex-1 min-w-0">
                  <code className="font-mono text-sm text-foreground">{ep.path}</code>
                  <p className="text-sm text-muted-foreground mt-1">{ep.description}</p>
                </div>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded whitespace-nowrap">
                  {ep.compatibility}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Available Models</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODELS.map((m) => (
              <div
                key={m.id}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <code className="font-mono text-sm font-medium text-foreground">{m.id}</code>
                  <ProviderBadge provider={m.provider} />
                </div>
                <p className="text-sm text-muted-foreground">{m.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">CherryStudio Setup</h2>
          <div className="bg-card border border-border rounded-lg p-5">
            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                  1
                </span>
                <div>
                  <p className="text-sm font-medium">Add API Provider</p>
                  <p className="text-sm text-muted-foreground">
                    Open CherryStudio Settings and add a new API provider. Set provider type to
                    either "OpenAI" or "Anthropic" (both work).
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                  2
                </span>
                <div>
                  <p className="text-sm font-medium">Set Base URL</p>
                  <p className="text-sm text-muted-foreground">
                    Enter <code className="bg-secondary px-1.5 py-0.5 rounded text-xs">{BASE_URL}/v1</code> as
                    the base URL.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                  3
                </span>
                <div>
                  <p className="text-sm font-medium">Set API Key</p>
                  <p className="text-sm text-muted-foreground">
                    Enter your <code className="bg-secondary px-1.5 py-0.5 rounded text-xs">PROXY_API_KEY</code> as
                    the API key.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                  4
                </span>
                <div>
                  <p className="text-sm font-medium">Add Models</p>
                  <p className="text-sm text-muted-foreground">
                    Add any model IDs listed above. Both OpenAI and Anthropic models are available
                    through either provider type.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Quick Test</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">OpenAI Format (chat/completions)</h3>
              <div className="bg-card border border-border rounded-lg p-4 relative">
                <pre className="font-mono text-sm text-foreground overflow-x-auto whitespace-pre-wrap break-all">
                  {curlChat}
                </pre>
                <div className="absolute top-3 right-3">
                  <CopyButton text={curlChat} />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Anthropic Format (messages)</h3>
              <div className="bg-card border border-border rounded-lg p-4 relative">
                <pre className="font-mono text-sm text-foreground overflow-x-auto whitespace-pre-wrap break-all">
                  {curlMessages}
                </pre>
                <div className="absolute top-3 right-3">
                  <CopyButton text={curlMessages} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
          AI API Integration Gateway
        </footer>
      </div>
    </div>
  );
}
