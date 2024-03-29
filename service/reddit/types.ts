export type RedditApiTypePrefixes = {
  t1: string;
  t2: string;
  t3: string;
  t4: string;
  t5: string;
  t6: string;
};

export type OAuth2 = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

export type SubredditResponseDataModel = {
  subreddit_id: string;
  id: string;
  permalink: string;
  subreddit: string;
  selftext: string;
  kind: string;
  kindType: string | null;
  title: string;
  num_comments?: number;
};

export type SubRedditResponse = {
  kind: string;
  data: {
    before: string | null;
    after: string | null;
    children: {
      kind: string;
      data: SubredditResponseDataModel;
    }[];
  };
};

export type ThreadResponseDataModel = {
  id: string;
  body: string;
  ups: number;
  distinguished: string | null;
  replies: ThreadCommentReplyResponse | string;
};

export type ThreadCommentsResponse = {
  kind: string;
  data: {
    children: {
      kind: string;
      data: ThreadResponseDataModel;
    }[];
  };
}[];

export type CommentResponseDataModel =
  | {
      kind: "t1";
      data: ThreadResponseDataModel;
    }
  | {
      kind: "more";
      data: MoreReplyCommentDataModel;
    };

export type ThreadCommentReplyResponse = {
  kind: string;
  data: {
    children: CommentResponseDataModel[];
  };
};

export type MoreReplyCommentDataModel = {
  count: number;
  name: string;
  id: string;
  parent_id: string;
  depth: number;
  children: string[];
};

export type CommentDataModel = {
  commentText: string;
  upvotes: number;
  commentId: string;
};

export type ThreadCommentsDataModel = {
  comments: CommentDataModel[] | null;
};

export type ThreadDataModel = SubredditResponseDataModel & ThreadCommentsDataModel;
