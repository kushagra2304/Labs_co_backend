"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.findUserById = exports.findUserByEmail = void 0;
const client_1 = __importDefault(require("../../prisma/client"));
const findUserByEmail = async (email) => {
    return client_1.default.user.findUnique({ where: { email } });
};
exports.findUserByEmail = findUserByEmail;
const findUserById = async (id) => {
    return client_1.default.user.findUnique({ where: { id } });
};
exports.findUserById = findUserById;
const createUser = async (data) => {
    return client_1.default.user.create({ data });
};
exports.createUser = createUser;
