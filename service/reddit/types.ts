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
  ups: string;
  distinguished: string | null;
};

export type GetThreadCommentsResponse = {
  kind: string;
  data: {
    children: {
      kind: string;
      data: ThreadResponseDataModel;
    }[];
  };
}[];
