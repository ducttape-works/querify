export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type Engine = {
  name: string;
  description: string;
  color: string;
  is_supported: boolean;
  is_default: boolean;
};
