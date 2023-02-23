import express from "express";
export const router = express.Router();
import { redditApi } from "../service/reddit/reddit";
import { parseQueryParams } from "../service/util";

router.post("/createCategory", async (req, res) => {
  if (!req?.body?.subreddits || !Array.isArray(req?.body?.subreddits)) {
    return res.status(400).json({ error: "bad request" });
  }
  const result = await redditApi.initRedditService(req?.body?.subreddits, req?.body?.query);
  res.status(201).json({ result });
});
