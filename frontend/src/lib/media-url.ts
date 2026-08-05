const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function toApiUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}
