import express from "express";
import type { ErrorRequestHandler } from "express";
import * as dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import cors from "cors";
import morgan from "morgan";
import { router } from "../routes/api";

dotenv.config();

const port = process.env.PORT || 8000;
export const app = express();

// set to allow rate limit to successfully limit user ips instead of proxy ip (e.g. hosting server)
app.set("trust proxy", 1);

// log to console in development using morgan package
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// allows access to the body object of the request
app.use(express.json());

// set express CORS options
const corsOptions = {
  origin: process.env.ORIGIN || "http://localhost:8000",
  optionsSuccessStatus: 200,
  preflightContinue: false,
  methods: ["POST", "GET"],
};

// enable CORS middleware
app.use(cors(corsOptions));

// Set CSP for extra layer of security,
// help prevent UI Redressing [UISECURITY] and XSS attacks
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-src 'none'; frame-ancestors 'none'; ");
  next();
});

console.log("This process is your pid " + process.pid);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 5 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

app.get("/", (req, res) => {
  res.status(200).send({ hello: "world" });
});

app.listen(port, () => {
  console.log(`now listening on port ${port}`);
});

// invoke curate-ai application
app.use("/api/v1", router);

// error handler middleware
const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  console.log("err caught in err middleware callback");
  console.error(error);
  res.status(500).send(`HTTP 500 - There is an issue with the server, please try again later.`);
};
app.use(errorHandler);
