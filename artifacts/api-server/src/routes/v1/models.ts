import { Router, type IRouter } from "express";

const MODELS = [
  { id: "gpt-5.2", provider: "openai", description: "Most capable general-purpose model" },
  { id: "gpt-5.1", provider: "openai", description: "Strong general-purpose model" },
  { id: "gpt-5", provider: "openai", description: "General-purpose model" },
  { id: "gpt-5-mini", provider: "openai", description: "Cost effective model for high-volume tasks" },
  { id: "o4-mini", provider: "openai", description: "Thinking model for complex reasoning" },
  { id: "o3", provider: "openai", description: "Thinking model, slower but more capable" },
  { id: "claude-opus-4-6", provider: "anthropic", description: "Most capable Anthropic model" },
  { id: "claude-sonnet-4-6", provider: "anthropic", description: "Balanced performance and speed" },
  { id: "claude-haiku-4-5", provider: "anthropic", description: "Fastest Anthropic model" },
];

const router: IRouter = Router();

router.get("/models", (_req, res) => {
  res.json({
    object: "list",
    data: MODELS.map((m) => ({
      id: m.id,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: m.provider,
      description: m.description,
    })),
  });
});

export default router;
export { MODELS };
