export type StarStory = {
  id: string;
  title: string;
  question: string;
  situation: string;
  task: string;
  action: string;
  result: string;
};

export type Profile = {
  id: string;
  user_id: string;
  resume_text: string | null;
  star_stories: StarStory[];
  extra_context: string | null;
  is_pro: boolean;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatRole = "user" | "assistant";

export type SessionMessage = {
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type SessionRecord = {
  id: string;
  user_id: string;
  topic: string;
  track?: "ml" | "swe";
  messages: SessionMessage[];
  created_at: string;
};
