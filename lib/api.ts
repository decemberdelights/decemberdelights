export const API = "";

export function documentApiUrl(url: string): string {
  const privateDocument = url.match(/^\/uploads\/private\/(career|franchise)\/([^/?#]+)$/);
  if (privateDocument) {
    return `${API}/api/files/${privateDocument[1]}/${encodeURIComponent(privateDocument[2])}`;
  }
  return url.startsWith("http") ? url : `${API}${url}`;
}
