-- ============================================
-- December Delights - Storage Buckets
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('franchise-docs', 'franchise-docs', false),
  ('career-docs', 'career-docs', false),
  ('menu-images', 'menu-images', true),
  ('product-images', 'product-images', true);

-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- MENU IMAGES: Public can read, authenticated can upload
CREATE POLICY "Public can view menu images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

CREATE POLICY "Authenticated can upload menu images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Authenticated can delete menu images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-images');

-- PRODUCT IMAGES: Public can read, authenticated can upload
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images');

-- FRANCHISE DOCS: Private, authenticated can upload and read
CREATE POLICY "Authenticated can view franchise docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'franchise-docs');

CREATE POLICY "Authenticated can upload franchise docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'franchise-docs');

CREATE POLICY "Authenticated can delete franchise docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'franchise-docs');

-- CAREER DOCS: Private, authenticated can upload and read
CREATE POLICY "Authenticated can view career docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'career-docs');

CREATE POLICY "Authenticated can upload career docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'career-docs');

CREATE POLICY "Authenticated can delete career docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'career-docs');
