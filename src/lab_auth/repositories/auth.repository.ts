import prisma from '../../prisma/client';

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({ where: { id } });
};

export const createUser = async (data: {
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "employee";
  department?: string;
  designation?: string;
}) => {
  return prisma.user.create({ data });
};
