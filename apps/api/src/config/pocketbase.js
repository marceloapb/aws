// ══════════════════════════════════════════════════════════════
// CONFIG/POCKETBASE.JS — Cliente PocketBase singleton
// ══════════════════════════════════════════════════════════════

import PocketBase from 'pocketbase';
import { env } from './env.js';

let pbInstance = null;
let lastAuth = 0;
const AUTH_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutos

export async function getPocketbaseClient() {
  if (!pbInstance) {
    pbInstance = new PocketBase(env.PB_URL);
    pbInstance.autoCancellation(false);
  }

  const now = Date.now();
  if (now - lastAuth > AUTH_REFRESH_INTERVAL) {
    await pbInstance.admins.authWithPassword(env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
    lastAuth = now;
  }

  return pbInstance;
}

export default getPocketbaseClient;
