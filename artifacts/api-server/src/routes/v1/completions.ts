import { Router, type IRouter } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

function getOpenAIClient() {
  return new OpenAI({
    baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
    apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
  });
}

function getAnthropicClient() {
  return new Anthropic({
    baseURL: process.env["AI_INTEGRATIONS_ANTHROPIC_BASE_URL"],
    apiKey: process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"],
  });
}

function isAnthropicModel(model: string): boolean {
  return model.startsWith("claude-");
}

interface OpenAIMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  name?: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

function openaiToAnthropicMessages(messages: OpenAIMessage[]): {
  system: string | undefined;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  let system: string | undefined;
  const converted: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      system = system ? `${system}\n${content}` : content;
    } else if (msg.role === "user" || msg.role === "assistant") {
      const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      converted.push({ role: msg.role, content });
    }
  }

  return { system, messages: converted };
}

router.post("/chat/completions", async (req, res) => {
  try {
    const { model, messages, stream, temperature, max_tokens, max_completion_tokens, tools, tool_choice, ...rest } = req.body;

    if (!model || !messages) {
      res.status(400).json({
        error: { message: "model and messages are required", type: "invalid_request_error" },
      });
      return;
    }

    if (isAnthropicModel(model)) {
      await handleAnthropicViaOpenAIFormat(req, res, {
        model, messages, stream, temperature, max_tokens, max_completion_tokens, tools, tool_choice,
      });
    } else {
      await handleOpenAI(req, res, {
        model, messages, stream, temperature, max_tokens, max_completion_tokens, tools, tool_choice, ...rest,
      });
    }
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    logger.error({ err: error }, "Proxy error in /v1/chat/completions");
    const status = error.status || 500;
    res.status(status).json({
      error: { message: error.message || "Internal server error", type: "api_error" },
    });
  }
});

async function handleOpenAI(req: import("express").Request, res: import("express").Response, params: Record<string, unknown>) {
  const openai = getOpenAIClient();

  const cleanParams: Record<string, unknown> = { ...params };
  delete cleanParams["keep_alive"];

  if (params.stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      ...cleanParams,
      stream: true,
    } as Parameters<typeof openai.chat.completions.create>[0]);

    for await (const chunk of stream as AsyncIterable<unknown>) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } else {
    const response = await openai.chat.completions.create(
      cleanParams as Parameters<typeof openai.chat.completions.create>[0]
    );
    res.json(response);
  }
}

async function handleAnthropicViaOpenAIFormat(
  _req: import("express").Request,
  res: import("express").Response,
  params: {
    model: string;
    messages: OpenAIMessage[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    max_completion_tokens?: number;
    tools?: unknown[];
    tool_choice?: unknown;
  }
) {
  const anthropic = getAnthropicClient();
  const { system, messages } = openaiToAnthropicMessages(params.messages);
  const maxTokens = params.max_completion_tokens || params.max_tokens || 8192;

  const anthropicParams: Record<string, unknown> = {
    model: params.model,
    messages,
    max_tokens: maxTokens,
  };

  if (system) anthropicParams["system"] = system;
  if (params.temperature !== undefined) anthropicParams["temperature"] = params.temperature;

  if (params.stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = anthropic.messages.stream(
      anthropicParams as Parameters<typeof anthropic.messages.stream>[0]
    );

    const id = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    for await (const event of stream) {
      const evt = event as { type: string; delta?: { type?: string; text?: string }; index?: number };
      if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
        const chunk = {
          id,
          object: "chat.completion.chunk",
          created,
          model: params.model,
          choices: [{
            index: 0,
            delta: { content: evt.delta.text },
            finish_reason: null,
          }],
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      } else if (evt.type === "message_stop") {
        const chunk = {
          id,
          object: "chat.completion.chunk",
          created,
          model: params.model,
          choices: [{
            index: 0,
            delta: {},
            finish_reason: "stop",
          }],
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } else {
    const response = await anthropic.messages.create(
      anthropicParams as Parameters<typeof anthropic.messages.create>[0]
    );

    const anthropicResp = response as { content: Array<{ type: string; text: string }>; usage: { input_tokens: number; output_tokens: number }; stop_reason: string };
    const text = anthropicResp.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");

    res.json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: params.model,
      choices: [{
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: "stop",
      }],
      usage: {
        prompt_tokens: anthropicResp.usage.input_tokens,
        completion_tokens: anthropicResp.usage.output_tokens,
        total_tokens: anthropicResp.usage.input_tokens + anthropicResp.usage.output_tokens,
      },
    });
  }
}

export default router;
