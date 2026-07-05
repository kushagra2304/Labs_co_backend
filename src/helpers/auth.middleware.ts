import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma/client";

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id?: string;
      userId?: string;
    };
    const userId = decoded.id ?? decoded.userId;
    if (!userId) return res.status(401).json({ message: "Invalid token payload" });

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles: ("admin" | "employee")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as "admin" | "employee")) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
}