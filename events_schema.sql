CREATE TABLE IF NOT EXISTS events_carousel (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE events_carousel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON events_carousel
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage events" ON events_carousel
  FOR ALL USING (auth.role() = 'authenticated');
