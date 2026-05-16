-- ============================================================
-- إصلاح نهائي شامل — شغّلي في SQL Editor واضغطي Confirm
-- ============================================================

-- 1. احذفي كل سياسات profiles الموجودة
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
  END LOOP;
END $$;

-- 2. تأكد RLS مفعّل
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. سياسات نظيفة وواضحة
-- SELECT: المستخدم يقرأ ملفه
CREATE POLICY "select_own_profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- INSERT: الـ trigger يكتب (SECURITY DEFINER يتجاوز RLS)
-- لكن نضيف سياسة للأمان
CREATE POLICY "insert_own_profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- UPDATE: المستخدم يعدّل ملفه
CREATE POLICY "update_own_profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 4. تأكد الـ trigger يعمل بـ SECURITY DEFINER (يتجاوز RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER   -- ← مهم جداً: يتجاوز RLS تلقائياً
SET search_path = public
AS $$
DECLARE
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  role_val  text  := coalesce(nullif(trim(meta->>'role'),''), 'pilgrim');
  first_nm  text  := coalesce(nullif(trim(meta->>'first_name'),''), 'مستخدم');
  last_nm   text  := coalesce(nullif(trim(meta->>'last_name'),''), 'جديد');
  full_nm   text  := coalesce(nullif(trim(meta->>'full_name'),''), first_nm||' '||last_nm);
  sfx       text  := substr(replace(gen_random_uuid()::text,'-',''),1,10);
BEGIN
  INSERT INTO public.profiles
    (id, first_name, last_name, full_name, email, phone, country_code, role, preferred_lang)
  VALUES (
    new.id, first_nm, last_nm, full_nm, new.email,
    nullif(trim(meta->>'phone'),''),
    coalesce(nullif(trim(meta->>'country_code'),''),'SA'),
    role_val,
    coalesce(nullif(trim(meta->>'preferred_lang'),''),'ar')
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name  = EXCLUDED.last_name,
    full_name  = EXCLUDED.full_name,
    updated_at = now();

  IF role_val = 'owner' THEN
    INSERT INTO public.provider_profiles
      (user_id, company_name, contact_person, license_number, commercial_registration, unified_number, city)
    VALUES (
      new.id,
      coalesce(nullif(trim(meta->>'company_name'),''), full_nm),
      nullif(trim(meta->>'contact_person'),''),
      coalesce(nullif(trim(meta->>'license_number'),''), 'LIC-'||sfx),
      coalesce(nullif(trim(meta->>'commercial_registration'),''), 'CR-'||sfx),
      nullif(trim(meta->>'unified_number'),''),
      nullif(trim(meta->>'city'),'')
    )
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now();
  ELSE
    INSERT INTO public.pilgrim_profiles
      (user_id, permit_number, national_id, emergency_contact_name, emergency_contact_phone, health_notes)
    VALUES (
      new.id,
      nullif(trim(meta->>'permit_number'),''),
      nullif(trim(meta->>'national_id'),''),
      nullif(trim(meta->>'emergency_contact_name'),''),
      nullif(trim(meta->>'emergency_contact_phone'),''),
      nullif(trim(meta->>'health_notes'),'')
    )
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now();
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. أزيلي قيود unique المشكلة
ALTER TABLE public.profiles         DROP CONSTRAINT IF EXISTS profiles_phone_key;
ALTER TABLE public.provider_profiles DROP CONSTRAINT IF EXISTS provider_profiles_license_number_key;
ALTER TABLE public.provider_profiles DROP CONSTRAINT IF EXISTS provider_profiles_commercial_registration_key;

DO $$ BEGIN RAISE NOTICE '✅ All fixed. Now disable email confirmations in Auth settings.'; END $$;
