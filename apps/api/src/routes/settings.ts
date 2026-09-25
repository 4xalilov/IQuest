import type { FastifyPluginAsync } from 'fastify';
import { getSettings, toPublicSettings } from '../services/settings';

const routes: FastifyPluginAsync = async (app) => {
  /** Ommaviy sozlamalar (auth shart emas) — /auth/telegram dagi `settings` bilan bir xil shakl. */
  app.get('/settings/public', async () => toPublicSettings(await getSettings(app.db)));
};
export default routes;
