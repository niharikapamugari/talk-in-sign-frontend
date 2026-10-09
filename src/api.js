// Vercel embeds VITE_* values during the build. The production fallback keeps
// the published app connected even if its dashboard variable is missing.
const productionApi = 'https://talk-in-sign-backend-production.up.railway.app';

export const API_URL = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.PROD ? productionApi : 'http://localhost:8080');
