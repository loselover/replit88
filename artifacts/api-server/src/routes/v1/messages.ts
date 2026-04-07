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

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string }>;
}

router.post("/messages", async (req, res) => {
  try {
    const { model, messages, system, stream, max_tokens, temperature, ...rest } = req.body;

    if (!model || !messages) {
      res.status(400).json({
        type: "error",
        error: { type: "invalid_request_error", message: "model and messages are required" },
      });
      return;
    }

    if (isAnthropicModel(model)) {
      await handleAnthropicNative(res, { model, messages, system, stream, max_tokens, temperature, ...rest });
    } else {
      await handleOpenAIViaAnthropicFormat(res, { model, messages, system, stream, max_tokens, temperature });
    }
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    logger.error({ err: error }, "Proxy error in /v1/messages");
    const status = error.status || 500;
    res.status(status).json({
      type: "error",
      error: { type: "api_error", message: error.message || "Internal server error" },
    });
  }
});

async function handleAnthropicNative(
  res: import("express").Response,
  params: Record<string, unknown>
) {
  const anthropic = getAnthropicClient();

  const cleanParams: Record<string, unknown> = { ...params };
  delete cleanParams["keep_alive"];

  if (!cleanParams["max_tokens"]) {
    cleanParams["max_tokens"] = 8192;
  }

  if (params.stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = anthropic.messages.stream(
      cleanParams as Parameters<typeof anthropic.messages.stream>[0]
    );

    for await (const event of stream) {
      const evt = event as Record<string, unknown>;
      res.write(`event: ${evt["type"]}\ndata: ${JSON.stringify(evt)}\n\n`);
    }

    res.end();
  } else {
    delete cleanParams["stream"];
    const response = await anthropic.messages.create(
      cleanParams as Parameters<typeof anthropic.messages.create>[0]
    );
    res.json(response);
  }
}

async function handleOpenAIViaAnthropicFormat(
  res: import("express").Response,
  params: {
    model: string;
    messages: AnthropicMessage[];
    system?: string;
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
  }
) {
  const openai = getOpenAIClient();

  const openaiMessages: Array<{ role: string; content: string }> = [];

  if (params.system) {
    openaiMessages.push({ role: "system", content: params.system });
  }

  for (const msg of params.messages) {
    const content = typeof msg.content === "string"
      ? msg.content
      : msg.content.filter((b) => b.type === "text").map((b) => b.text || "").join("");
    openaiMessages.push({ role: msg.role, content });
  }

  if (params.stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const msgId = `msg_${Date.now()}`;

    const startEvent = {
      type: "message_start",
      message: {
        id: msgId,
        type: "message",
        role: "assistant",
        content: [],
        model: params.model,
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    };
    res.write(`event: message_start\ndata: ${JSON.stringify(startEvent)}\n\n`);

    const blockStart = {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    };
    res.write(`event: content_block_start\ndata: ${JSON.stringify(blockStart)}\n\n`);

    const stream = await openai.chat.completions.create({
      model: params.model,
      messages: openaiMessages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
      stream: true,
      max_completion_tokens: params.max_tokens || 8192,
    });

    for await (const chunk of stream as AsyncIterable<{ choices: Array<{ delta: { content?: string } }> }>) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        const delta = {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: content },
        };
        res.write(`event: content_block_delta\ndata: ${JSON.stringify(delta)}\n\n`);
      }
    }

    const blockStop = { type: "content_block_stop", index: 0 };
    res.write(`event: content_block_stop\ndata: ${JSON.stringify(blockStop)}\n\n`);

    const msgDelta = {
      type: "message_delta",
      delta: { stop_reason: "end_turn" },
      usage: { output_tokens: 0 },
    };
    res.write(`event: message_delta\ndata: ${JSON.stringify(msgDelta)}\n\n`);

    const msgStop = { type: "message_stop" };
    res.write(`event: message_stop\ndata: ${JSON.stringify(msgStop)}\n\n`);

    res.end();
  } else {
    const response = await openai.chat.completions.create({
      model: params.model,
      messages: openaiMessages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
      max_completion_tokens: params.max_tokens || 8192,
    });

    const choice = response.choices[0];
    res.json({
      id: `msg_${Date.now()}`,
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: choice?.message?.content || "" }],
      model: params.model,
      stop_reason: "end_turn",
      usage: {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
      },
    });
  }
}

export default router;
