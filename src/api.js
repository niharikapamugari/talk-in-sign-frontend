// Vercel embeds VITE_* values during the build. The production fallback keeps
// the published app connected even if its dashboard variable is missing.
const productionApi = 'https://talk-in-sign-backend.onrender.com';

export const API_URL = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.PROD ? productionApi : 'http://localhost:8080');

// Leave this empty for local development. In production it should point to a
// public media host ending in `/signs`, not to the Vercel application itself.
const signVideoBaseUrl = import.meta.env.VITE_SIGN_VIDEO_BASE_URL?.replace(/\/$/, '');

export function resolveSignVideoUrl(videoUrl) {
  if (!videoUrl || /^https?:\/\//i.test(videoUrl) || !signVideoBaseUrl) return videoUrl;
  const fileName = videoUrl.replace(/^\/assets\/signs\//, '');
  return `${signVideoBaseUrl}/${fileName}`;
}
