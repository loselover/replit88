import type { Request, Response, NextFunction } from "express";

export function proxyAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
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

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: {
        message: "Missing or invalid Authorization header. Use: Bearer <your-api-key>",
        type: "authentication_error",
      },
    });
    return;
  }

  const token = authHeader.slice(7);
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
