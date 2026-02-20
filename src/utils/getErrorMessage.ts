import type { AxiosError } from 'axios';

export function getErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<{ error?: string }>;
  return axiosErr?.response?.data?.error || fallback;
}
