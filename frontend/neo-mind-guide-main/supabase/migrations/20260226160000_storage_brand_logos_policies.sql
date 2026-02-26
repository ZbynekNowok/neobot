-- RLS policies for storage bucket "brand-logos"
-- Create the bucket in Supabase Dashboard: Storage → New bucket → name: brand-logos, Public: ON

-- Allow authenticated users to upload to their own folder only: {user_id}/...
CREATE POLICY "brand-logos: authenticated insert own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-logos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Allow overwrite (upsert): authenticated users can update their own files
CREATE POLICY "brand-logos: authenticated update own folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-logos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Public read for brand-logos (so getPublicUrl works for logos)
CREATE POLICY "brand-logos: public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'brand-logos');

-- Allow authenticated users to delete their own files
CREATE POLICY "brand-logos: authenticated delete own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-logos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
