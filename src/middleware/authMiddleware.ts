import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AUTH_SECRET } from "@config";

import log from "../logger";

interface AuthRequest extends Request {
  user?: string | JwtPayload;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    res.status(401).json({ error: "Authorization header not provided" });
    return;
  }

  const tokenParts = authHeader.split(" ");
  if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
    res.status(401).json({ error: "Invalid Authorization header format" });
    return;
  }

  const token = tokenParts[1];
  const secret = AUTH_SECRET;

  if (!secret) {
    log.error("AUTH_SECRET is not defined in .env");
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err || !decoded) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.user = decoded;

    next();
  });
};
