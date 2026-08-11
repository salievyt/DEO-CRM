export type LearningCategory =
  | "basics"
  | "sales"
  | "channels"
  | "automation"
  | "analytics"
  | "team"
  | "tasks";

export interface LearningCategoryMeta {
  value: LearningCategory;
  label: string;
  count: number;
}

export type ArticleBlockType = "paragraph" | "list" | "steps" | "callout";
export type CalloutTone = "info" | "tip" | "success" | "warning";

export interface ArticleBlock {
  type: ArticleBlockType;
  text?: string;
  items?: string[];
  tone?: CalloutTone;
}

export interface ArticleSection {
  heading: string;
  blocks: ArticleBlock[];
}

export interface LearningArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: LearningCategory;
  category_display: string;
  reading_time_minutes: number;
  section_count: number;
  order: number;
}

export interface LearningArticleDetail extends LearningArticle {
  sections: ArticleSection[];
  /** Present on the admin detail endpoint (ArticleWriteSerializer). */
  is_published?: boolean;
  updated_at: string;
}

export interface LearningListResponse {
  results: LearningArticle[];
  categories: LearningCategoryMeta[];
  /** Slugs of articles the current user has read (per-user, from the backend). */
  read: string[];
}

export interface LearningAdminArticle extends LearningArticle {
  is_published: boolean;
  updated_at: string;
}

/** Draft block used by the admin editor before serialization. */
export interface ArticleBlockDraft {
  type: ArticleBlockType;
  text?: string;
  items?: string[];
  /** For list/steps blocks the editor works with a plain-textarea value. */
  lines?: string;
  tone?: CalloutTone;
}

export interface ArticleSectionDraft {
  heading: string;
  blocks: ArticleBlockDraft[];
}
