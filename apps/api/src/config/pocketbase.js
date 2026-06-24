import PocketBase from 'pocketbase';
import { env } from './env.js';

let pbInstance = null;

export async function getPocketbaseClient() {
  if (pbInstance) return pbInstance;
  pbInstance = new PocketBase(env.POCKETBASE_URL);
  if (env.POCKETBASE_ADMIN_EMAIL && env.POCKETBASE_ADMIN_PASSWORD) {
    await pbInstance.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
  }
  pbInstance.autoCancellation(false);
  return pbInstance;
}

export function resetPocketbaseClient() {
  pbInstance = null;
}
