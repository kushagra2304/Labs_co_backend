"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initChatGateway = exports.chatRoutes = void 0;
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
exports.chatRoutes = chat_routes_1.default;
const chat_gateway_1 = require("./sockets/chat.gateway");
Object.defineProperty(exports, "initChatGateway", { enumerable: true, get: function () { return chat_gateway_1.initChatGateway; } });
