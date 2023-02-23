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
  async searchReddit(
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
  async searchWithinSubreddits(
    listOfSubRedditURIs: Array<string> | null,
    accessToken: string,
    queryParams: string = ""
  ) {
    if (!Array.isArray(listOfSubRedditURIs) || listOfSubRedditURIs.length === 0) {
      return null;
    }
    const listOfSubRedditPayloads: Array<SubredditResponseDataModel[]> = await Promise.all(
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
            // had to use as keyof to handle specific object keys from const
            kindType: REDDIT_API_TYPE_PREFIXES[child?.kind as keyof RedditApiTypePrefixes] || null,
            title: child?.data?.title,
            num_comments: child?.data?.num_comments,
          };
        });
      })
    );
    return listOfSubRedditPayloads.flat();
  },
  async getRedditThreadComments(
    listOfThreadPayloads: SubredditResponseDataModel[],
    accessToken: string,
    queryParams: string = "",
    COMMENT_TOTAL_MIN: number = 5
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
                commentTotal: threadPayload?.num_comments,
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

  async initRedditService(subreddits: string[], query: string) {
    const accessToken = await this.getRedditAppAccessToken();
    if (!accessToken) {
      console.log("Error: reddit access code is invalid");
      return null;
    }

    // const redditSearchResults = await this.searchReddit(
    //   parseQueryParams({
    //     q: query,
    //     t: "year",
    //   }),
    //   accessToken,
    //   1000,
    //   10
    // );
    // return [...new Set((redditSearchResults || [])?.map((searchResults) => searchResults.subreddit))].sort();

    const mostCommentedThreads = await this.searchWithinSubreddits(
      subreddits,
      accessToken,
      parseQueryParams({
        q: query,
        sort: "relevance",
        t: "year",
        restrict_sr: "1",
      })
    );

    const mostCommentedUniqueThreads = (mostCommentedThreads || []).filter(
      (thread, i, threads) => threads.findIndex((t) => t.permalink === thread.permalink) === i
    );

    if (mostCommentedUniqueThreads.length === 0) {
      return null;
    }

    const threadCommentsPayload = await this.getRedditThreadComments(
      mostCommentedUniqueThreads,
      accessToken,
      "",
      5
    );
    return threadCommentsPayload?.filter((threadCommentPayload) => threadCommentPayload.comments.length > 5);
  },
};
