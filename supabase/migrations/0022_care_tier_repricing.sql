-- =============================================================================
-- 0022_care_tier_repricing.sql
-- Rebrand the public catalog to the three "Care" tiers and hide the Free tier.
--
--   Essential Care  ₹999    — Get discovered online.
--   Advanced Care   ₹4,999  — Build your complete digital clinic.   (most popular)
--   Complete Care   ₹9,999  — Grow your practice with marketing and reputation.
--
-- We REUSE the existing plan codes (visibility/practice/pro) so every code path
-- that gates on `code` keeps working — only the customer-facing name, price,
-- ordering and popularity change.
--
-- The Free tier row is NOT deleted: onboarding still assigns new clinics to
-- code='free' and the trial-expiry cron downgrades to it. We only flip
-- is_active=false so the public /pricing pages (which filter on is_active) stop
-- showing it. Service-role callers query it by code directly, unaffected by RLS.
--
-- Idempotent: pure UPDATEs keyed by code, safe to re-run.
-- =============================================================================

-- Hide Free from the marketing pages (still exists for onboarding + cron).
update public.subscription_plans
   set is_active = false
 where code = 'free';

-- Feature sets are kept as clean supersets so each higher tier includes
-- everything below it (no inverted-tier gaps):
--   Essential ⊂ Advanced ⊂ Complete
--
-- Essential Care — discovery / online presence (price unchanged at ₹999).
update public.subscription_plans
   set display_name      = 'Essential Care',
       tagline           = 'Get discovered online.',
       monthly_price_inr = 999,
       annual_price_inr  = 7188,   -- 40% off (₹599/mo × 12)
       is_active         = true,
       is_popular        = false,
       sort_order        = 1,
       features          = '{
         "public_listing": true,
         "patient_enquiries": true,
         "calendar": true,
         "emr": true,
         "whatsapp_templates": false,
         "sponsored_placement": false,
         "online_consult": false,
         "custom_domain": false,
         "departments_max": 2,
         "analytics": "none"
       }'::jsonb
 where code = 'visibility';

-- Advanced Care — the complete digital clinic (was ₹2,999 → ₹4,999).
-- Superset of Essential + full practice software (calendar, EMR, WhatsApp).
update public.subscription_plans
   set display_name      = 'Advanced Care',
       tagline           = 'Build your complete digital clinic.',
       monthly_price_inr = 4999,
       annual_price_inr  = 35988,  -- 40% off (₹2,999/mo × 12)
       razorpay_plan_id  = null,   -- price changed → force a fresh Razorpay sync
       is_active         = true,
       is_popular        = true,
       sort_order        = 2,
       features          = '{
         "public_listing": true,
         "patient_enquiries": true,
         "calendar": true,
         "emr": true,
         "whatsapp_templates": true,
         "sponsored_placement": true,
         "online_consult": false,
         "custom_domain": true,
         "departments_max": 5,
         "analytics": "basic"
       }'::jsonb
 where code = 'practice';

-- Complete Care — growth, marketing & reputation (was ₹4,999 → ₹9,999).
-- Everything: online consult, full analytics, unlimited departments.
update public.subscription_plans
   set display_name      = 'Complete Care',
       tagline           = 'Grow your practice with marketing and reputation management.',
       monthly_price_inr = 9999,
       annual_price_inr  = 71988,  -- 40% off (₹5,999/mo × 12)
       razorpay_plan_id  = null,   -- price changed → force a fresh Razorpay sync
       is_active         = true,
       is_popular        = false,
       sort_order        = 3,
       features          = '{
         "public_listing": true,
         "patient_enquiries": true,
         "calendar": true,
         "emr": true,
         "whatsapp_templates": true,
         "sponsored_placement": true,
         "online_consult": true,
         "custom_domain": true,
         "departments_max": 0,
         "analytics": "full"
       }'::jsonb
 where code = 'pro';
