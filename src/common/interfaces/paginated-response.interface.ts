export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    page: number;
  };
  links: {
    prev?: string;
    next?: string;
  };
}
