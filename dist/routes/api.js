"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
exports.router = express_1.default.Router();
const reddit_1 = require("../service/reddit/reddit");
exports.router.post("/createCategory", async (req, res) => {
    if (!req?.body?.query) {
        return res.status(400).json({ error: "bad request" });
    }
    const result = await reddit_1.redditApi.initRedditService(req?.body?.query);
    res.status(201).json({ result });
});
//# sourceMappingURL=api.js.map