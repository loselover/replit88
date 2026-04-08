import type { Request, Response, NextFunction } from "express";
import { logger } from "../../lib/logger";

export function proxyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env["PROXY_API_KEY"];

  if (!apiKey) {
    res.status(500).json({
      error: {
        message: "PROXY_API_KEY not configured on server",
        type: "server_error",
      },
    });
    return;
  }

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
    logger.warn({
      authMethod,
      hasAuthorization: !!authHeader,
      hasXApiKey: !!xApiKey,
      authorizationPrefix: authHeader ? authHeader.slice(0, 10) : null,
    }, "Auth failed: no token extracted");
    res.status(401).json({
      error: {
        message: "Missing API key. Use Authorization: Bearer <key> or x-api-key: <key>",
        type: "authentication_error",
      },
    });
    return;
  }

  if (token !== apiKey) {
    logger.warn({
      authMethod,
      tokenLength: token.length,
      expectedLength: apiKey.length,
      tokenPrefix: token.slice(0, 4),
    }, "Auth failed: key mismatch");
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
