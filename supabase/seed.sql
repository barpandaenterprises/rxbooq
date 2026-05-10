-- =============================================================================
-- seed.sql — local dev / staging seed data.
-- Two clinics so cross-tenant isolation can be tested:
--   1. mahakur     — pilot client (Mahakur Poly Dental Clinic)
--   2. democlinic  — generic demo for QA + onboarding rehearsal
-- =============================================================================

insert into public.clinics (id, slug, name, plan, status, theme, locale_default, locales, whatsapp_number)
values
  ('11111111-1111-1111-1111-111111111111',
   'mahakur',
   'Mahakur Poly Dental Clinic',
   'silver',
   'active',
   '{"brand":"#0168B3","brandDark":"#0E5087"}'::jsonb,
   'en',
   '{en,hi,or}',
   '+919999900001'),
  ('22222222-2222-2222-2222-222222222222',
   'democlinic',
   'Demo Clinic',
   'gold',
   'active',
   '{"brand":"#0F766E","brandDark":"#0E443F"}'::jsonb,
   'en',
   '{en,hi}',
   '+919999900002')
on conflict (id) do nothing;

-- Mahakur: doctor + services
insert into public.doctors (id, clinic_id, display_name, qualifications, bio, display_order)
values
  ('aaaaaaa1-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Dr. P. Mahakur',
   'BDS, MDS (Prosthodontics)',
   '20+ years of trusted dental care in Sambalpur.',
   1)
on conflict (id) do nothing;

insert into public.services (clinic_id, name, description, duration_minutes, price_inr, display_order)
values
  ('11111111-1111-1111-1111-111111111111', 'General Checkup',  'Full dental examination and consultation.', 30,  500, 1),
  ('11111111-1111-1111-1111-111111111111', 'Root Canal',       'Painless single-sitting root canal therapy.', 60, 4500, 2),
  ('11111111-1111-1111-1111-111111111111', 'Teeth Whitening',  'In-office professional whitening.',           45, 3500, 3),
  ('11111111-1111-1111-1111-111111111111', 'Braces Consult',   'Orthodontic consultation and plan.',          30,  500, 4)
on conflict do nothing;

-- Mahakur: weekly availability — Mon–Sat 10:00–13:00 and 17:00–20:00
insert into public.doctor_availability (clinic_id, doctor_id, weekday, start_time, end_time, slot_minutes)
select '11111111-1111-1111-1111-111111111111',
       'aaaaaaa1-0000-0000-0000-000000000001',
       w, '10:00'::time, '13:00'::time, 15
from generate_series(1,6) as w
on conflict do nothing;

insert into public.doctor_availability (clinic_id, doctor_id, weekday, start_time, end_time, slot_minutes)
select '11111111-1111-1111-1111-111111111111',
       'aaaaaaa1-0000-0000-0000-000000000001',
       w, '17:00'::time, '20:00'::time, 15
from generate_series(1,6) as w
on conflict do nothing;

-- Demo Clinic: doctor + 2 services so the second tenant has something to render
insert into public.doctors (id, clinic_id, display_name, qualifications, display_order)
values
  ('aaaaaaa2-0000-0000-0000-000000000002',
   '22222222-2222-2222-2222-222222222222',
   'Dr. A. Demo',
   'MBBS',
   1)
on conflict (id) do nothing;

insert into public.services (clinic_id, name, duration_minutes, price_inr, display_order)
values
  ('22222222-2222-2222-2222-222222222222', 'Demo Service A', 30, 600, 1),
  ('22222222-2222-2222-2222-222222222222', 'Demo Service B', 45, 900, 2)
on conflict do nothing;

-- WhatsApp templates (canonical set, English variants — Hindi/Odia added later)
insert into public.wa_templates (name, language, variables, status)
values
  ('booking_confirmation_v1',     'en', '{patient_name,clinic_name,date,time,clinic_address}', 'pending'),
  ('reminder_evening_before_v1',  'en', '{patient_name,clinic_name,date,time}',                 'pending'),
  ('reminder_one_hour_v1',        'en', '{patient_name,clinic_name,time}',                      'pending'),
  ('reschedule_options_v1',       'en', '{patient_name,clinic_name}',                           'pending'),
  ('post_visit_followup_v1',      'en', '{patient_name,clinic_name,followup_link}',             'pending'),
  ('review_request_v1',           'en', '{patient_name,clinic_name,review_link}',               'pending')
on conflict do nothing;
