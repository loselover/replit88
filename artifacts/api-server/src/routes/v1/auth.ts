import type { Request, Response, NextFunction } from "express";

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

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (xApiKey) {
    token = xApiKey;
  }

  if (!token) {
    res.status(401).json({
      error: {
        message: "Missing API key. Use Authorization: Bearer <key> or x-api-key: <key>",
        type: "authentication_error",
      },
    });
    return;
  }

  if (token !== apiKey) {
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
