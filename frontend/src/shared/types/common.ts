export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  error: boolean;
  detail: Record<string, string[]> | string;
  status_code: number;
}
