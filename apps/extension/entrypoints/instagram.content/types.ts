export type Profile = {
  id?: string;
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

export type ProgressPhase = "target" | "user-id" | "followings" | "followers" | "results";

export type ProgressUpdate = {
  phase: ProgressPhase;
  message: string;
  collected?: number;
  page?: number;
};

export type InstagramCurrentUserResponse = {
  form_data?: {
    username?: string;
  };
  user?: {
    username?: string;
  };
};
