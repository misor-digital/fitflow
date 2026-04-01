-- ============================================================================
-- Feedback Images - Supabase Storage bucket for feedback form field images
-- Migration: 20260315120000_create_feedback_images_bucket
--
-- Creates a public Storage bucket for images attached to feedback form fields.
-- Images are uploaded by staff via the admin form builder and displayed to
-- customers on the public feedback form page.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-images',
  'feedback-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Staff can upload images
CREATE POLICY "feedback_images_staff_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-images'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'marketing', 'content')
    )
  );

-- Staff can update (overwrite) images
CREATE POLICY "feedback_images_staff_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'feedback-images'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'marketing', 'content')
    )
  );

-- Staff can delete images
CREATE POLICY "feedback_images_staff_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'feedback-images'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin')
    )
  );

-- Public read access (images are shown on the public feedback form page)
CREATE POLICY "feedback_images_public_read"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'feedback-images');

CREATE POLICY "feedback_images_auth_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'feedback-images');

-- Service role full access
CREATE POLICY "feedback_images_service_role"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'feedback-images')
  WITH CHECK (bucket_id = 'feedback-images');
