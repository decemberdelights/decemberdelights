-- Run this in Supabase SQL Editor to create all required storage buckets

-- Create franchise-docs bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'franchise-docs',
  'franchise-docs',
  true,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Create career-docs bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'career-docs',
  'career-docs',
  true,
  5242880,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Create product-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create menu-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all buckets
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id IN ('franchise-docs', 'career-docs', 'product-images', 'menu-images'));

-- Allow authenticated insert/delete to all buckets
CREATE POLICY "Authenticated insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('franchise-docs', 'career-docs', 'product-images', 'menu-images'));

CREATE POLICY "Authenticated delete" ON storage.objects
  FOR DELETE USING (bucket_id IN ('franchise-docs', 'career-docs', 'product-images', 'menu-images'));
