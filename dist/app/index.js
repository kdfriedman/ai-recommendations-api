"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const dotenv = __importStar(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const api_1 = require("../routes/api");
dotenv.config();
const port = process.env.PORT || 8000;
exports.app = (0, express_1.default)();
// set to allow rate limit to successfully limit user ips instead of proxy ip (e.g. hosting server)
exports.app.set("trust proxy", 1);
// log to console in development using morgan package
if (process.env.NODE_ENV === "development") {
    exports.app.use((0, morgan_1.default)("dev"));
}
// allows access to the body object of the request
exports.app.use(express_1.default.json());
// set express CORS options
const corsOptions = {
    origin: process.env.ORIGIN || "http://localhost:8000",
    optionsSuccessStatus: 200,
    preflightContinue: false,
    methods: ["POST", "GET"],
};
// enable CORS middleware
exports.app.use((0, cors_1.default)(corsOptions));
// Set CSP for extra layer of security,
// help prevent UI Redressing [UISECURITY] and XSS attacks
exports.app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-src 'none'; frame-ancestors 'none'; ");
    next();
});
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
// Apply the rate limiting middleware to all requests
exports.app.use(limiter);
exports.app.get("/", (req, res) => {
    res.status(200).send({ hello: "world" });
});
exports.app.listen(port, () => {
    console.log(`now listening on port ${port}`);
});
// invoke curate-ai application
exports.app.use("/api/v1", api_1.router);
// error handler middleware
const errorHandler = (error, req, res, next) => {
    console.log("err caught in err middleware callback");
    console.error(error);
    res.status(500).send(`HTTP 500 - There is an issue with the server, please try again later.`);
};
exports.app.use(errorHandler);
//# sourceMappingURL=index.js.map