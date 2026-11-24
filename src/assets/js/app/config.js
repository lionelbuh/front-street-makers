/*
 * Site configuration.
 *
 * API_BASE: the address of the Cloudflare Worker (docs/SETUP.md), for example
 *   'https://api.frontstreetmakers.com'. Leave it empty to run in DEMO MODE:
 *   the site shows the sample stalls, and applications, stories and the admin
 *   dashboard work entirely inside the visitor's own browser (nothing is sent).
 *
 * TURNSTILE_SITE_KEY: optional Cloudflare Turnstile site key for the public forms
 *   (pair it with the TURNSTILE_SECRET on the worker).
 */
export const CONFIG = {
  API_BASE: '',
  TURNSTILE_SITE_KEY: '',
  CONTACT_EMAIL: 'hello@frontstreetmakers.com',
  SITE_NAME: 'Front Street Makers'
};

export const DEMO_MODE = !CONFIG.API_BASE;
