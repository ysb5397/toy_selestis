import { handleStudioAPI } from './web-studio.mjs';
export default {
  async fetch(request, env) {
    return await handleStudioAPI(request) || env.ASSETS.fetch(request);
  },
};
