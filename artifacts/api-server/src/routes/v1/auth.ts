import type { Request, Response, NextFunction } from "express";
import { logger } from "../../lib/logger";
import { getApiKey } from "../../lib/keyManager";

export function proxyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = getApiKey();

  const authHeader = req.headers.authorization;
  const xApiKey = req.headers["x-api-key"] as string | undefined;

  let token: string | undefined;
  let authMethod = "none";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
    authMethod = "bearer";
  } else if (authHeader) {
    authMethod = "bearer-malformed";
  } else if (xApiKey) {
    token = xApiKey;
    authMethod = "x-api-key";
  }

  if (!token) {
    logger.warn({ authMethod, hasAuthorization: !!authHeader, hasXApiKey: !!xApiKey }, "Auth failed: no token");
    res.status(401).json({
      error: {
        message: "Missing API key. Use Authorization: Bearer <key> or x-api-key: <key>",
        type: "authentication_error",
      },
    });
    return;
  }

  if (token !== apiKey) {
    logger.warn({ authMethod, tokenLength: token.length, expectedLength: apiKey.length }, "Auth failed: key mismatch");
    res.status(401).json({
      error: {
        message: "Invalid API key",
        type: "authentication_error",
      },
    });
    return;
  }

  next();
}
