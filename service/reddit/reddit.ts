import fs from "fs/promises";
import { getData } from "../service";
import { REDDIT_API_TYPE_PREFIXES } from "../reddit/constants";
import { parseQueryParams } from "../util";
import { findByValue } from "../../util/util";
import {
  RedditApiTypePrefixes,
  OAuth2,
  SubredditResponseDataModel,
  SubRedditResponse,
  ThreadCommentsResponse,
  ThreadCommentReplyResponse,
  MoreReplyCommentDataModel,
  ThreadDataModel,
} from "../reddit/types";

export const redditApi = {
  consolidatedReplies: "",
  moreReplies: [] as MoreReplyCommentDataModel[],
  conslidateCommentReplies(replies: ThreadCommentReplyResponse) {
    if (!replies?.data?.children) {
      return null;
    }
    for (const reply of replies?.data?.children) {
      if (reply.kind === "more") {
        console.log(replies.data);
        this.moreReplies.push(reply.data);
        continue;
      }
      const formattedReply = reply.data.body.trim().replace(/\n/g, "");
      this.consolidatedReplies += `COMMENT_START-${formattedReply}`; // TODO: after testing, remove COMMENT_START
      if (typeof reply.data.replies !== "string") {
        this.conslidateCommentReplies(reply.data.replies);
      }
    }
    return this.consolidatedReplies;
  },
  async getOAuthToken() {
    try {
      // must be in base64 format for basic auth header
      const credentials = Buffer.from(
        `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
      ).toString("base64");
      const response: OAuth2 = await getData(process.env.REDDIT_API_ACCESS_TOKEN_URI || "", {
        method: "POST",
        headers: {
          "User-Agent": process.env.REDDIT_UNIQUE_USER_AGENT || "node:my-unique-app:v1.0.0",
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      return response?.access_token;
    } catch (err) {
      console.log(err);
      return null;
    }
  },
  async getThreadsBySubreddit(
    listOfSubRedditURIs: Array<string> | null,
    accessToken: string,
    sort: string = "",
    queryParams: string = ""
  ) {
    if (!Array.isArray(listOfSubRedditURIs) || listOfSubRedditURIs.length === 0) {
      return null;
    }
    try {
      const listOfSubRedditPayloads = await Promise.all(
        listOfSubRedditURIs.map(async (subreddit) => {
          const response: SubRedditResponse = await getData(
            `${process.env.REDDIT_API_HOST}/r/${subreddit}/${sort}${queryParams}`,
            {
              method: "GET",
              headers: {
                "User-Agent": process.env.REDDIT_UNIQUE_USER_AGENT || "node:my-unique-app:v1.0.0",
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          return response?.data?.children.map((child) => ({
            subreddit_id: child?.data?.subreddit_id,
            id: child?.data?.id,
            permalink: child?.data?.permalink,
            subreddit: child?.data?.subreddit,
            selftext: child?.data?.selftext,
            kind: child?.kind,
            kindType: REDDIT_API_TYPE_PREFIXES[child?.kind as keyof RedditApiTypePrefixes] || null,
            title: child?.data?.title,
          }));
        })
      );
      return listOfSubRedditPayloads.flat();
    } catch (err) {
      console.log(err);
      return null;
    }
  },
  async getAllThreadsByQuery(
    queryParams: string,
    accessToken: string,
    RESULTS_LIMIT: number = 100,
    NUM_OF_COMMENTS_MIN: number = 5
  ) {
    let searchResultsAmount = 0;
    // store reddit pagination id to fetch next batch of threads
    let searchResultsPaginatedAfterID: string | null = "";
    let searchResults: SubredditResponseDataModel[] = [];
    if (!queryParams) return null;

    while (searchResultsAmount <= RESULTS_LIMIT || searchResultsPaginatedAfterID === null) {
      try {
        // only add after query param when paginated after id exists (next page)
        const response: SubRedditResponse = await getData(
          `${process.env.REDDIT_API_HOST}/search/${queryParams}${
            searchResultsPaginatedAfterID ? `&after=${searchResultsPaginatedAfterID}` : ""
          }`,
          {
            method: "GET",
            headers: {
              "User-Agent": process.env.REDDIT_UNIQUE_USER_AGENT || "node:my-unique-app:v1.0.0",
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        searchResultsAmount += response.data.children.length;

        for (let child of response?.data?.children) {
          const numOfComments = child?.data?.num_comments ?? 0;
          // only store threads with more than comment minimum
          if (numOfComments >= NUM_OF_COMMENTS_MIN) {
            searchResults.push({
              subreddit_id: child?.data?.subreddit_id,
              id: child?.data?.id,
              permalink: child?.data?.permalink,
              subreddit: child?.data?.subreddit,
              selftext: child?.data?.selftext,
              kind: child?.kind,
              kindType: REDDIT_API_TYPE_PREFIXES[child?.kind as keyof RedditApiTypePrefixes] || null,
              title: child?.data?.title,
              num_comments: child?.data?.num_comments,
            });
          }
        }

        // if after paginated id is null no more results exist from reddit search
        if (!response.data.after) {
          searchResultsPaginatedAfterID = null;
          break;
        }
        searchResultsPaginatedAfterID = response.data.after;
      } catch (err) {
        console.log(err);
        searchResultsPaginatedAfterID = null;
        break;
      }
    }
    return searchResults;
  },
  async getSubredditThreadsByQuery(
    listOfSubRedditURIs: Array<string> | null,
    accessToken: string,
    queryParams: string = ""
  ) {
    if (!Array.isArray(listOfSubRedditURIs) || listOfSubRedditURIs.length === 0) {
      return null;
    }
    const listOfSubRedditPayloads: Array<SubredditResponseDataModel> = [];
    const threadChildren: Array<{
      kind: string;
      data: SubredditResponseDataModel;
    }> = [];
    try {
      for (const subredditURI of listOfSubRedditURIs) {
        const response: SubRedditResponse = await getData(
          `${process.env.REDDIT_API_HOST}/r/${subredditURI}/search/${queryParams}`,
          {
            method: "GET",
            headers: {
              "User-Agent": process.env.REDDIT_UNIQUE_USER_AGENT || "node:my-unique-app:v1.0.0",
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        threadChildren.push(...response.data.children);
        // paginate over all available cursors
        let paginatedNextCursor = response.data.after;
        while (paginatedNextCursor) {
          console.log(`paginating results in ${subredditURI} with after id: ${paginatedNextCursor}`);
          const paginatedResponse: SubRedditResponse = await getData(
            `${process.env.REDDIT_API_HOST}/r/${subredditURI}/search/${queryParams}&after=${paginatedNextCursor}`,
            {
              method: "GET",
              headers: {
                "User-Agent": process.env.REDDIT_UNIQUE_USER_AGENT || "node:my-unique-app:v1.0.0",
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          threadChildren.push(...paginatedResponse.data.children);
          paginatedNextCursor = paginatedResponse.data.after;
        }
      }
      for (const child of threadChildren) {
        listOfSubRedditPayloads.push({
          subreddit_id: child?.data?.subreddit_id,
          id: child?.data?.id,
          permalink: child?.data?.permalink,
          subreddit: child?.data?.subreddit,
          selftext: child?.data?.selftext,
          kind: child?.kind,
          // had to use as keyof to handle specific object keys from const
          kindType: REDDIT_API_TYPE_PREFIXES[child?.kind as keyof RedditApiTypePrefixes] || null,
          title: child?.data?.title,
          num_comments: child?.data?.num_comments,
        });
      }
      return listOfSubRedditPayloads;
    } catch (err) {
      console.log(err);
      return null;
    }
  },
  async getThreadComments(
    listOfThreadPayloads: SubredditResponseDataModel[],
    accessToken: string,
    queryParams: string = "",
    COMMENT_TOTAL_MIN: number = 0
  ) {
    try {
      const threadAllComments = await Promise.all(
        listOfThreadPayloads.map(async (threadPayload) => {
          const response: ThreadCommentsResponse = await getData(
            `${process.env.REDDIT_API_HOST}${threadPayload.permalink}${queryParams}`,
            {
              method: "GET",
              headers: {
                "User-Agent": process.env.REDDIT_UNIQUE_USER_AGENT || "node:my-unique-app:v1.0.0",
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          // filter out link types and only keep comment types
          const listOfCommentPayloads = response
            .filter((commentPayload) => {
              return commentPayload.data?.children?.some((childComment) => childComment.kind === "t1");
            })
            .map((commentPayload) => {
              return {
                commentTotal: threadPayload?.num_comments,
                comments: commentPayload.data.children
                  // filter out mod comments
                  .filter((comment) => !comment.data.distinguished)
                  .map((comment) => {
                    // recursively search comment tree and combine all comment replies into one large string of text
                    const commentReplies =
                      typeof comment?.data?.replies !== "string"
                        ? this.conslidateCommentReplies(comment?.data?.replies)
                        : null;
                    return {
                      commentId: comment.data.id,
                      topCommentText: comment.data.body,
                      upvotes: comment.data.ups,
                      replies: commentReplies,
                    };
                  }),
                subreddit_id: threadPayload.subreddit_id,
                id: threadPayload.id,
                permalink: threadPayload.permalink,
                subreddit: threadPayload.subreddit,
                selftext: threadPayload.selftext,
                kind: threadPayload.kind,
                kindType: threadPayload.kindType,
                title: threadPayload.title,
                num_comments: threadPayload.num_comments,
              };
            });
          return listOfCommentPayloads.filter(
            (commentPayload) => commentPayload && commentPayload.comments.length > COMMENT_TOTAL_MIN
          );
        })
      );
      return threadAllComments.flat();
    } catch (err) {
      console.log(err);
      return null;
    }
  },
  async getMoreReplies(
    moreReplies: MoreReplyCommentDataModel[],
    threadComments: ThreadDataModel[],
    accessToken: string
  ) {
    for (const reply of [moreReplies[0]]) {
      // TODO: reference old reddit morecomments call and update logic below
      // look into using FormData to send in body vs JSON stringify vs string
      // also every example has t3_ portion with separate id, figure out where that comes from?
      try {
        // const response: unknown = await getData(`${process.env.REDDIT_API_HOST}/api/morechildren`, {
        //   method: "POST",
        //   headers: {
        //     "User-Agent": process.env.REDDIT_UNIQUE_USER_AGENT || "node:my-unique-app:v1.0.0",
        //     Authorization: `Bearer ${accessToken}`,
        //     "Content-Type": "application/json",
        //   },
        //   // `link_id=${reply.parent_id}&children=${reply.children.join(",")}&limit_children=true`
        //   body: `link_id=${'test'}&children=${reply.children.join(
        //     ","
        //   )}&limit_children=true`,
        // });
        // console.log(response);
      } catch (err) {
        console.log(err);
        break;
      }
    }
    return threadComments;
  },

  // joinMoreRepliesIntoCommentThreads() {
  //   // findByValue
  // },
  async initRedditService(subreddits: string[], queries: string[]) {
    const accessToken = await this.getOAuthToken();
    if (!accessToken) {
      console.log("Error: reddit access code is invalid");
      return null;
    }

    const subredditSearchQueries = queries.map(async (query) => {
      return await this.getSubredditThreadsByQuery(
        subreddits,
        accessToken,
        parseQueryParams({
          q: query,
          sort: "relevance",
          t: "year",
          restrict_sr: "1",
          limit: "100",
        })
      );
    });
    const mostRelevantThreadsBasedOnQueries = await Promise.all(subredditSearchQueries);
    const mostRelevantThreads = mostRelevantThreadsBasedOnQueries.filter(
      (thread): thread is SubredditResponseDataModel[] => thread !== null
    );
    const mostCommentedUniqueThreads = (mostRelevantThreads.flat() || []).filter(
      (thread, i, threads) => threads.findIndex((t) => t.permalink === thread.permalink) === i
    );
    if (mostCommentedUniqueThreads.length === 0) {
      return null;
    }

    const threadComments = await this.getThreadComments(mostCommentedUniqueThreads, accessToken, "", 0);

    if (!Array.isArray(threadComments)) return null;
    const uniqueMoreReplies = this.moreReplies.filter(
      (reply, index, moreReplies) =>
        reply.count > 0 && moreReplies.findIndex((r) => r.id === reply.id) === index
    );
    const threadCommentsWithMoreReplies = await this.getMoreReplies(
      uniqueMoreReplies,
      threadComments,
      accessToken
    );
    return "hello world";
  },
};
