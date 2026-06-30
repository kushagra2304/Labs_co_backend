"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.findUserById = exports.findUserByEmail = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const findUserByEmail = async (email) => {
    return prisma.user.findUnique({ where: { email } });
};
exports.findUserByEmail = findUserByEmail;
const findUserById = async (id) => {
    return prisma.user.findUnique({ where: { id } });
};
exports.findUserById = findUserById;
const createUser = async (data) => {
    return prisma.user.create({ data });
};
exports.createUser = createUser;
