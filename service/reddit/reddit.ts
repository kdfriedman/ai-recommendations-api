import { getData } from "../service";
import { REDDIT_API_TYPE_PREFIXES } from "../reddit/constants";
import { parseQueryParams } from "../util";
import {
  RedditApiTypePrefixes,
  OAuth2,
  SubredditResponseDataModel,
  SubRedditResponse,
  GetThreadCommentsResponse,
} from "../reddit/types";

export const redditApi = {
  async getRedditAppAccessToken() {
    try {
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
  async getRedditSubReddits(
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
  async searchReddit(queryParams: string, accessToken: string, RESULTS_LIMIT: number = 100) {
    let searchResultsAmount = 0;
    let searchResultsPaginatedAfterID: string | null = "";
    let searchResults:
      | {
          subreddit_id: string;
          id: string;
          permalink: string;
          subreddit: string;
          selftext: string;
          kind: string;
          kindType: string | null;
          title: string;
        }[] = [];
    if (!queryParams) return null;

    while (searchResultsAmount <= RESULTS_LIMIT || searchResultsPaginatedAfterID === null) {
      try {
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
        response?.data?.children?.forEach((child) => {
          searchResults.push({
            subreddit_id: child?.data?.subreddit_id,
            id: child?.data?.id,
            permalink: child?.data?.permalink,
            subreddit: child?.data?.subreddit,
            selftext: child?.data?.selftext,
            kind: child?.kind,
            kindType: REDDIT_API_TYPE_PREFIXES[child?.kind as keyof RedditApiTypePrefixes] || null,
            title: child?.data?.title,
          });
        });
        searchResultsAmount += response.data.children.length;
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
  async searchWithinSubreddits(
    listOfSubRedditURIs: Array<string> | null,
    accessToken: string,
    queryParams: string = ""
  ) {
    if (!Array.isArray(listOfSubRedditURIs) || listOfSubRedditURIs.length === 0) {
      return null;
    }
    const listOfSubRedditPayloads = await Promise.all(
      listOfSubRedditURIs.map(async (subreddit) => {
        const response: SubRedditResponse = await getData(
          `${process.env.REDDIT_API_HOST}/r/${subreddit}/search/${queryParams}`,
          {
            method: "GET",
            headers: {
              "User-Agent": process.env.REDDIT_UNIQUE_USER_AGENT || "node:my-unique-app:v1.0.0",
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        return response?.data?.children.map((child) => {
          return {
            subreddit_id: child?.data?.subreddit_id,
            id: child?.data?.id,
            permalink: child?.data?.permalink,
            subreddit: child?.data?.subreddit,
            selftext: child?.data?.selftext,
            kind: child?.kind,
            kindType: REDDIT_API_TYPE_PREFIXES[child?.kind as keyof RedditApiTypePrefixes] || null,
            title: child?.data?.title,
          };
        });
      })
    );
    return listOfSubRedditPayloads.flat();
  },
  async getRedditThreadComments(
    listOfThreadPayloads: SubredditResponseDataModel[],
    accessToken: string,
    queryParams: string = ""
  ) {
    try {
      const threadAllComments = await Promise.all(
        listOfThreadPayloads.map(async (threadPayload) => {
          const response: GetThreadCommentsResponse = await getData(
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

          const listOfCommentPayloads = response
            .filter((commentPayload) => {
              return commentPayload.data?.children?.some((childComment) => childComment.kind === "t1");
            })
            .map((commentPayload) => {
              return {
                comments: commentPayload.data.children
                  .filter((comment) => !comment.data.distinguished)
                  .map((comment) => {
                    return {
                      commentId: comment.data.id,
                      topCommentText: comment.data.body,
                      upvotes: comment.data.ups,
                    };
                  }),
                threadTitle: threadPayload.selftext,
                subreddit_id: threadPayload.subreddit_id,
                threadId: threadPayload.id,
                permalink: threadPayload.permalink,
                subreddit: threadPayload.subreddit,
                selftext: threadPayload.selftext,
                kind: threadPayload.kind,
                kindType: threadPayload.kindType,
                title: threadPayload.title,
              };
            });
          return listOfCommentPayloads.filter(
            (commentPayload) => commentPayload && commentPayload.comments.length > 0
          );
        })
      );
      return threadAllComments.flat();
    } catch (err) {
      console.log(err);
      return null;
    }
  },

  async initRedditService(query: string) {
    const accessToken = await this.getRedditAppAccessToken();
    if (!accessToken) return;

    const redditSearchResults = await this.searchReddit(
      parseQueryParams({
        q: query,
        t: "year",
      }),
      accessToken,
      1000
    );

    return redditSearchResults;

    // const listOfSubreddits = process.env.REDDIT_SUBREDDIT_LIST
    //   ? process.env.REDDIT_SUBREDDIT_LIST.split(",")
    //   : null;

    // const mostCommentedThreadQueries = await Promise.allSettled(
    //   threadSearchQueries.map(
    //     async (query) =>
    //       await getRedditSubReddits(
    //         listOfSubreddits,
    //         accessToken,
    //         parseQueryParams({
    //           q: query,
    //           sort: "comments",
    //           t: "year",
    //           type: REDDIT_API_TYPE_PREFIXES.t3,
    //           restrict_sr: "1",
    //           limit: "100",
    //         })
    //       )
    //   )
    // );

    // const mostCommentedThreads = mostCommentedThreadQueries
    //   .filter(
    //     (
    //       mostCommentedThreadQuery
    //     ): mostCommentedThreadQuery is PromiseFulfilledResult<SubredditResponseDataModel[]> =>
    //       mostCommentedThreadQuery.status === "fulfilled" && mostCommentedThreadQuery.value !== null
    //   )
    //   .flatMap((comment) => comment.value);

    // const mostCommentedUniqueThreads = mostCommentedThreads.filter(
    //   (thread, i, threads) => threads.findIndex((t) => t.permalink === thread.permalink) === i
    // );

    // if (!Array.isArray(mostCommentedUniqueThreads) || mostCommentedUniqueThreads.length === 0) {
    //   return;
    // }

    // const threadCommentsPayload = await getRedditThreadComments(threads, accessToken);
    // return threadCommentsPayload;
  },
};
