/**
 * Memoised Razorpay Node SDK instance. Server-only — the secret key never
 * leaves the server. The browser only sees order/subscription ids and the
 * public key id (passed through Razorpay Checkout config).
 *
 * Throws on import (lazily — only when first used) if the secrets are
 * missing, so a misconfigured env crashes loudly during the first paid
 * operation rather than silently 500ing.
 */

import Razorpay from "razorpay";

let _client: Razorpay | null = null;

export function razorpay(): Razorpay {
  if (_client) return _client;

  const key_id     = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  }

  _client = new Razorpay({ key_id, key_secret });
  return _client;
}

export function razorpayPublicKey(): string {
  // Safe to expose to the client (it's the public half of the key pair).
  const key = process.env.RAZORPAY_KEY_ID;
  if (!key) throw new Error("RAZORPAY_KEY_ID must be set");
  return key;
}
