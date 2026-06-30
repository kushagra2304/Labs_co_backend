import {
  findUserByEmail,
  createUser,
} from "../repositories/auth.repository";
import { hashPassword, comparePassword } from "../utils/hash.util";
import { signToken } from "../utils/jwt.util";

export const registerUser = async (input: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "employee";
  department?: string;
  designation?: string;
}) => {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw { status: 409, message: "User already exists with this email" };
  }

  const passwordHash = await hashPassword(input.password);

  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    department: input.department,
    designation: input.designation,
  });

  const token = signToken({ userId: user.id, role: user.role as "admin" | "employee" });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw { status: 401, message: "Invalid email or password" };
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw { status: 401, message: "Invalid email or password" };
  }

  if (!user.isActive) {
    throw { status: 403, message: "Account is deactivated" };
  }

  const token = signToken({ userId: user.id, role: user.role as "admin" | "employee" });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};