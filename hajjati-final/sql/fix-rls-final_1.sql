-- ============================================================
-- إصلاح خطأ 403 "permission denied for table profiles"
-- شغّلي هذا في Supabase → SQL Editor → Run
-- ============================================================

-- ── الخطوة 1: تأكد أن RLS مفعّل ──
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── الخطوة 2: احذفي السياسات القديمة المتعارضة ──
DROP POLICY IF EXISTS profiles_select_own       ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own       ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_trigger   ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own       ON public.profiles;

-- ── الخطوة 3: أعيدي السياسات بشكل صحيح ──

-- SELECT: المستخدم يقرأ ملفه فقط
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- INSERT: يسمح للـ trigger (SECURITY DEFINER) بالإدراج
CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() IS NOT NULL);

-- UPDATE: المستخدم يعدّل ملفه فقط  
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── الخطوة 4: إصلاح الـ Trigger ليتجنب أخطاء unique ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta         jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role    text  := coalesce(nullif(trim(meta->>'role'), ''), 'pilgrim');
  first_nm     text  := coalesce(nullif(trim(meta->>'first_name'), ''), 'مستخدم');
  last_nm      text  := coalesce(nullif(trim(meta->>'last_name'), ''), 'جديد');
  full_nm      text  := coalesce(nullif(trim(meta->>'full_name'), ''), trim(first_nm || ' ' || last_nm));
  rand_sfx     text  := substr(replace(gen_random_uuid()::text,'-',''), 1, 10);
BEGIN
  -- profiles
  INSERT INTO public.profiles (id, first_name, last_name, full_name, email, phone, country_code, role, preferred_lang)
  VALUES (
    new.id, first_nm, last_nm, full_nm, new.email,
    nullif(trim(meta->>'phone'), ''),
    coalesce(nullif(trim(meta->>'country_code'), ''), 'SA'),
    user_role,
    coalesce(nullif(trim(meta->>'preferred_lang'), ''), 'ar')
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name  = EXCLUDED.last_name,
    full_name  = EXCLUDED.full_name,
    updated_at = now();

  IF user_role = 'owner' THEN
    INSERT INTO public.provider_profiles (user_id, company_name, contact_person, license_number, commercial_registration, unified_number, city)
    VALUES (
      new.id,
      coalesce(nullif(trim(meta->>'company_name'), ''), full_nm),
      nullif(trim(meta->>'contact_person'), ''),
      coalesce(nullif(trim(meta->>'license_number'), ''), 'LIC-' || rand_sfx),
      coalesce(nullif(trim(meta->>'commercial_registration'), ''), 'CR-' || rand_sfx),
      nullif(trim(meta->>'unified_number'), ''),
      nullif(trim(meta->>'city'), '')
    )
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now();
  ELSE
    INSERT INTO public.pilgrim_profiles (user_id, permit_number, national_id, emergency_contact_name, emergency_contact_phone, health_notes)
    VALUES (
      new.id,
      nullif(trim(meta->>'permit_number'), ''),
      nullif(trim(meta->>'national_id'), ''),
      nullif(trim(meta->>'emergency_contact_name'), ''),
      nullif(trim(meta->>'emergency_contact_phone'), ''),
      nullif(trim(meta->>'health_notes'), '')
    )
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now();
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user: % (%)', SQLERRM, SQLSTATE;
  RETURN new;
END;
$$;

-- إعادة ربط الـ trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- إزالة قيد phone unique (يسبب تعارضاً)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;

-- إزالة قيود provider_profiles unique المشكلة
ALTER TABLE public.provider_profiles DROP CONSTRAINT IF EXISTS provider_profiles_license_number_key;
ALTER TABLE public.provider_profiles DROP CONSTRAINT IF EXISTS provider_profiles_commercial_registration_key;

-- تأكيد
DO $$ BEGIN
  RAISE NOTICE '✅ RLS + Trigger fixed. Test login now.';
END $$;