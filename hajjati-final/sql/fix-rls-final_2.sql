-- ============================================================
-- إصلاح RLS نهائي — شغّلي في SQL Editor
-- ============================================================

-- احذفي كل سياسات profiles
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE tablename='profiles' AND schemaname='public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "'||r.policyname||'" ON public.profiles';
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: كل مستخدم يقرأ ملفه
CREATE POLICY "select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- INSERT: السماح للـ trigger (SECURITY DEFINER يتجاوز RLS تلقائياً)
CREATE POLICY "insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- UPDATE: المستخدم يعدّل ملفه
CREATE POLICY "update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- أزيلي قيد phone unique
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;

-- أزيلي قيود provider_profiles المشكلة
ALTER TABLE public.provider_profiles
  DROP CONSTRAINT IF EXISTS provider_profiles_license_number_key;
ALTER TABLE public.provider_profiles
  DROP CONSTRAINT IF EXISTS provider_profiles_commercial_registration_key;

DO $$ BEGIN RAISE NOTICE '✅ Done'; END $$;
