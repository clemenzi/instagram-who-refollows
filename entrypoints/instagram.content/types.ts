export type Profile = {
  username: string;
  full_name: string;
  profile_pic_url?: string;
};

export type Results = {
  dontFollowMeBack: Profile[];
  followingsWhoFollowBack: Profile[];
  followersCount: number;
  followingsCount: number;
};

export type Connection = {
  queryHash: string;
  edge: 'edge_followed_by' | 'edge_follow';
};

export type ProgressPhase =
  | 'target'
  | 'user-id'
  | 'followings'
  | 'followers'
  | 'results';

export type ProgressUpdate = {
  phase: ProgressPhase;
  message: string;
  collected?: number;
  page?: number;
};

export type InstagramProfilesResponse = {
  edges: Array<{
    node: Profile;
  }>;
  page_info: {
    has_next_page: boolean;
    end_cursor: string | null;
  };
};

export type InstagramGraphqlResponse = {
  data?: {
    user?: {
      edge_followed_by?: InstagramProfilesResponse;
      edge_follow?: InstagramProfilesResponse;
    };
  };
};

export type InstagramCurrentUserResponse = {
  form_data?: {
    username?: string;
  };
  user?: {
    username?: string;
  };
};
