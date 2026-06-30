import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, department, designation } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await registerUser({ name, email, password, role, department, designation });
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const result = await loginUser(email, password);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
};