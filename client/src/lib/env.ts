/**
 * Build-time flags.
 *
 * `VITE_DEMO_ONLY` produces the static variant described in §14: no Socket.IO, no
 * admin console, Demo Mode on by default, everything driven by the bundled snapshot.
 * That is the build GitHub Pages serves, since Pages cannot run the live server.
 */
export const DEMO_ONLY = import.meta.env.VITE_DEMO_ONLY === 'true';
export const BASE_URL = import.meta.env.BASE_URL;
