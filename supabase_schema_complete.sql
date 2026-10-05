-- ============================================================================
-- SERA STORY & TEMPLATE ENGINE - COMPLETE SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Dependency order has been resolved so that this script can be executed 
-- in a single run on a blank Supabase database.
-- Includes full RLS policies and Auto-Profile creation triggers.
-- ============================================================================

-- Enable UUID extension (Required for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DROP TABLES IF THEY EXIST (To prevent duplication and constraint conflicts)
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

DROP TABLE IF EXISTS public.wa_blast_logs CASCADE;
DROP TABLE IF EXISTS public.rsvp CASCADE;
DROP TABLE IF EXISTS public.revision_requests CASCADE;
DROP TABLE IF EXISTS public.project_rundowns CASCADE;
DROP TABLE IF EXISTS public.project_events CASCADE;
DROP TABLE IF EXISTS public.photo_uploads CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.love_story_items CASCADE;
DROP TABLE IF EXISTS public.guestbook_entries CASCADE;
DROP TABLE IF EXISTS public.gift_registry CASCADE;
DROP TABLE IF EXISTS public.digital_gifts CASCADE;
DROP TABLE IF EXISTS public.checkins CASCADE;
DROP TABLE IF EXISTS public.guests CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.packages CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- 1. Table: public.profiles
-- ============================================================================
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['user'::text, 'admin'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. Table: public.packages
-- ============================================================================
CREATE TABLE public.packages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price integer NOT NULL,
  duration_days integer,
  max_photos integer NOT NULL,
  max_events integer NOT NULL,
  max_wa_blast integer,
  max_videos integer NOT NULL DEFAULT 0,
  has_rsvp boolean NOT NULL DEFAULT false,
  has_amplop_digital boolean NOT NULL DEFAULT false,
  has_guestbook boolean NOT NULL DEFAULT false,
  has_live_slideshow boolean NOT NULL DEFAULT false,
  has_ganti_warna boolean NOT NULL DEFAULT false,
  has_ganti_font boolean NOT NULL DEFAULT false,
  has_kombinasi_desain boolean NOT NULL DEFAULT false,
  has_rsvp_custom boolean NOT NULL DEFAULT false,
  has_rundown boolean NOT NULL DEFAULT false,
  has_love_story boolean NOT NULL DEFAULT true,
  has_hitung_mundur boolean NOT NULL DEFAULT true,
  has_request_musik boolean NOT NULL DEFAULT true,
  has_free_reschedule boolean NOT NULL DEFAULT true,
  revisi_mayor integer NOT NULL DEFAULT 1,
  revisi_minor integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT packages_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 3. Table: public.templates
-- ============================================================================
CREATE TABLE public.templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  github_repo_url text NOT NULL,
  preview_url text,
  thumbnail_url text,
  category text,
  min_package text NOT NULL DEFAULT 'basic'::text CHECK (min_package = ANY (ARRAY['basic'::text, 'silver'::text, 'premium'::text, 'exclusive'::text])),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT templates_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 4. Table: public.orders
-- ============================================================================
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  package_id uuid NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text, 'expired'::text])),
  shopee_order_id text UNIQUE,
  shopee_payment_ref text,
  shopee_raw_webhook jsonb,
  paid_at timestamp with time zone,
  expired_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT orders_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id)
);

-- ============================================================================
-- 5. Table: public.subscriptions
-- ============================================================================
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  package_id uuid NOT NULL,
  order_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text])),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT subscriptions_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id),
  CONSTRAINT subscriptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

-- ============================================================================
-- 6. Table: public.projects
-- ============================================================================
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  subscription_id uuid,
  template_id uuid NOT NULL,
  project_name text NOT NULL,
  github_repo text,
  site_url text,
  custom_domain text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'building'::text, 'live'::text, 'archived'::text])),
  bride_name text,
  groom_name text,
  wedding_date date,
  wedding_time time without time zone,
  venue_name text,
  venue_address text,
  venue_maps_url text,
  color_theme text,
  font_choice text,
  music_url text,
  love_story text,
  photo_urls text[] DEFAULT '{}'::text[],
  video_urls text[] DEFAULT '{}'::text[],
  events jsonb DEFAULT '[]'::jsonb,
  rundown jsonb DEFAULT '[]'::jsonb,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  bride_nickname text,
  bride_father text,
  bride_father_deceased boolean DEFAULT false,
  bride_mother text,
  bride_mother_deceased boolean DEFAULT false,
  groom_nickname text,
  groom_father text,
  groom_father_deceased boolean DEFAULT false,
  groom_mother text,
  groom_mother_deceased boolean DEFAULT false,
  bride_instagram text,
  groom_instagram text,
  bride_photo_url text,
  groom_photo_url text,
  religion text CHECK (religion = ANY (ARRAY['islam'::text, 'kristen'::text, 'katolik'::text, 'hindu'::text, 'buddha'::text, 'konghucu'::text, 'other'::text])),
  gallery_photos jsonb DEFAULT '[]'::jsonb,
  cover_photo_url text,
  opening_photo_url text,
  love_story_items jsonb DEFAULT '[]'::jsonb,
  live_stream_url text,
  live_stream_label text,
  payment_accounts jsonb DEFAULT '[]'::jsonb,
  wishlist_url text,
  wishlist_note text,
  health_protocol text,
  hashtag text,
  countdown_target timestamp with time zone,
  wizard_step integer NOT NULL DEFAULT 1,
  wizard_completed boolean NOT NULL DEFAULT false,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT projects_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  CONSTRAINT projects_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id)
);

-- ============================================================================
-- 7. Table: public.guests
-- ============================================================================
CREATE TABLE public.guests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  group_name text,
  seat_label text,
  invitation_slug text DEFAULT (uuid_generate_v4())::text UNIQUE,
  is_vip boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT guests_pkey PRIMARY KEY (id),
  CONSTRAINT guests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- ============================================================================
-- 8. Table: public.checkins
-- ============================================================================
CREATE TABLE public.checkins (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  guest_id uuid NOT NULL,
  checked_in_at timestamp with time zone NOT NULL DEFAULT now(),
  checked_out_at timestamp with time zone,
  scanned_by text,
  notes text,
  CONSTRAINT checkins_pkey PRIMARY KEY (id),
  CONSTRAINT checkins_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT checkins_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE
);

-- ============================================================================
-- 9. Table: public.digital_gifts
-- ============================================================================
CREATE TABLE public.digital_gifts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  sender_name text NOT NULL,
  sender_phone text,
  amount integer,
  payment_method text,
  bank_name text,
  bank_account text,
  message text,
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT digital_gifts_pkey PRIMARY KEY (id),
  CONSTRAINT digital_gifts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- ============================================================================
-- 10. Table: public.gift_registry (Kado Fisik)
-- ============================================================================
CREATE TABLE public.gift_registry (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  image_url text,
  price integer,
  original_price integer,
  discount_label text,
  link text,
  is_bought boolean NOT NULL DEFAULT false,
  bought_by_guest_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gift_registry_pkey PRIMARY KEY (id),
  CONSTRAINT gift_registry_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT gift_registry_bought_by_guest_id_fkey FOREIGN KEY (bought_by_guest_id) REFERENCES public.guests(id) ON DELETE SET NULL
);

-- ============================================================================
-- 11. Table: public.guestbook_entries
-- ============================================================================
CREATE TABLE public.guestbook_entries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  guest_id uuid,
  name text NOT NULL,
  message text NOT NULL,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT guestbook_entries_pkey PRIMARY KEY (id),
  CONSTRAINT guestbook_entries_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE SET NULL,
  CONSTRAINT guestbook_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- ============================================================================
-- 12. Table: public.love_story_items (Kisah Cinta Terstruktur)
-- ============================================================================
CREATE TABLE public.love_story_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  year text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT love_story_items_pkey PRIMARY KEY (id),
  CONSTRAINT love_story_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- ============================================================================
-- 13. Table: public.notifications
-- ============================================================================
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info'::text CHECK (type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text])),
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- 14. Table: public.photo_uploads
-- ============================================================================
CREATE TABLE public.photo_uploads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  file_name text NOT NULL,
  original_size_kb integer,
  compressed_size_kb integer,
  width integer,
  height integer,
  photo_type text NOT NULL DEFAULT 'gallery'::text CHECK (photo_type = ANY (ARRAY['cover'::text, 'opening'::text, 'bride'::text, 'groom'::text, 'gallery'::text, 'love_story'::text, 'venue'::text, 'other'::text])),
  is_used boolean NOT NULL DEFAULT true,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT photo_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT photo_uploads_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT photo_uploads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- 15. Table: public.project_events
-- ============================================================================
CREATE TABLE public.project_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['akad'::text, 'resepsi'::text, 'pemberkatan'::text, 'ngaben'::text, 'pawiwahan'::text, 'siraman'::text, 'midodareni'::text, 'pengajian'::text, 'custom'::text])),
  custom_label text,
  event_date date NOT NULL,
  event_time time without time zone,
  end_time time without time zone,
  venue_name text NOT NULL,
  venue_address text,
  venue_maps_url text,
  venue_photo_url text,
  dresscode text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  CONSTRAINT project_events_pkey PRIMARY KEY (id),
  CONSTRAINT project_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- ============================================================================
-- 16. Table: public.project_rundowns (Rundown Terstruktur)
-- ============================================================================
CREATE TABLE public.project_rundowns (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  event_id uuid,
  time_label text NOT NULL,
  activity text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT project_rundowns_pkey PRIMARY KEY (id),
  CONSTRAINT project_rundowns_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT project_rundowns_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.project_events(id) ON DELETE SET NULL
);

-- ============================================================================
-- 17. Table: public.revision_requests
-- ============================================================================
CREATE TABLE public.revision_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['mayor'::text, 'minor'::text])),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'done'::text, 'rejected'::text])),
  admin_notes text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT revision_requests_pkey PRIMARY KEY (id),
  CONSTRAINT revision_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT revision_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- 18. Table: public.rsvp
-- ============================================================================
CREATE TABLE public.rsvp (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  guest_id uuid,
  guest_name text,
  guest_phone text,
  attendance text NOT NULL CHECK (attendance = ANY (ARRAY['hadir'::text, 'tidak_hadir'::text, 'mungkin'::text])),
  pax integer NOT NULL DEFAULT 1,
  message text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rsvp_pkey PRIMARY KEY (id),
  CONSTRAINT rsvp_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT rsvp_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE SET NULL
);

-- ============================================================================
-- 19. Table: public.wa_blast_logs
-- ============================================================================
CREATE TABLE public.wa_blast_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  guest_id uuid,
  phone text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'queued'::text CHECK (status = ANY (ARRAY['queued'::text, 'sent'::text, 'delivered'::text, 'failed'::text])),
  provider_ref text,
  sent_at timestamp with time zone,
  failed_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wa_blast_logs_pkey PRIMARY KEY (id),
  CONSTRAINT wa_blast_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT wa_blast_logs_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE SET NULL
);


-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_site_url ON public.projects(site_url);
CREATE INDEX IF NOT EXISTS idx_projects_custom_domain ON public.projects(custom_domain);
CREATE INDEX IF NOT EXISTS idx_guests_project_id ON public.guests(project_id);
CREATE INDEX IF NOT EXISTS idx_guests_invitation_slug ON public.guests(invitation_slug);
CREATE INDEX IF NOT EXISTS idx_checkins_project_id ON public.checkins(project_id);
CREATE INDEX IF NOT EXISTS idx_checkins_guest_id ON public.checkins(guest_id);
CREATE INDEX IF NOT EXISTS idx_digital_gifts_project_id ON public.digital_gifts(project_id);
CREATE INDEX IF NOT EXISTS idx_gift_registry_project_id ON public.gift_registry(project_id);
CREATE INDEX IF NOT EXISTS idx_guestbook_entries_project_id ON public.guestbook_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_love_story_items_project_id ON public.love_story_items(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_project_id ON public.photo_uploads(project_id);
CREATE INDEX IF NOT EXISTS idx_project_events_project_id ON public.project_events(project_id);
CREATE INDEX IF NOT EXISTS idx_project_rundowns_project_id ON public.project_rundowns(project_id);
CREATE INDEX IF NOT EXISTS idx_revision_requests_project_id ON public.revision_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_project_id ON public.rsvp(project_id);
CREATE INDEX IF NOT EXISTS idx_wa_blast_logs_project_id ON public.wa_blast_logs(project_id);


-- ============================================================================
-- PROFILE AUTOMATION TRIGGER (auth.users -> public.profiles)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.phone,
    new.raw_user_meta_data->>'avatar_url',
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guestbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_story_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_rundowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_blast_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Packages Policies (Public select, Admin write)
CREATE POLICY "Packages are viewable by everyone" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Admins can manage packages" ON public.packages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Templates Policies (Public select, Admin write)
CREATE POLICY "Templates are viewable by everyone" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage templates" ON public.templates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Orders Policies (User owns or Admin)
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Subscriptions Policies (User owns or Admin)
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Projects Policies (Public can select live, owner manages)
CREATE POLICY "Public read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Owner manage projects" ON public.projects FOR ALL USING (auth.uid() = user_id);

-- 7. Guests Policies (Public can select, owner manages)
CREATE POLICY "Public read guests" ON public.guests FOR SELECT USING (true);
CREATE POLICY "Owner manage guests" ON public.guests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- 8. Checkins Policies (Owner manages)
CREATE POLICY "Owner manage checkins" ON public.checkins FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- 9. Digital Gifts Policies (Public can insert, owner manages)
CREATE POLICY "Public insert digital gifts" ON public.digital_gifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner manage digital gifts" ON public.digital_gifts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- 10. Gift Registry Policies (Public read/update to buy, owner manages)
CREATE POLICY "Public read gift registry" ON public.gift_registry FOR SELECT USING (true);
CREATE POLICY "Public update gift registry" ON public.gift_registry FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Owner manage gift registry" ON public.gift_registry FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- 11. Guestbook Entries Policies (Public read approved / write, owner manages)
CREATE POLICY "Public read approved guestbook" ON public.guestbook_entries FOR SELECT USING (
  is_approved = true OR EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Public insert guestbook" ON public.guestbook_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner manage guestbook" ON public.guestbook_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- 12. Love Story Items Policies (Public read, owner manages)
CREATE POLICY "Public read love story" ON public.love_story_items FOR SELECT USING (true);
CREATE POLICY "Owner manage love story" ON public.love_story_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- 13. Notifications Policies (User owns)
CREATE POLICY "Users can manage their own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- 14. Photo Uploads Policies (Public read, owner manages)
CREATE POLICY "Public read photo uploads" ON public.photo_uploads FOR SELECT USING (true);
CREATE POLICY "Owner manage photo uploads" ON public.photo_uploads FOR ALL USING (auth.uid() = user_id);

-- 15. Project Events Policies (Public read, owner manages)
CREATE POLICY "Public read project events" ON public.project_events FOR SELECT USING (true);
CREATE POLICY "Owner manage project events" ON public.project_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- 16. Project Rundowns Policies (Public read, owner manages)
CREATE POLICY "Public read project rundowns" ON public.project_rundowns FOR SELECT USING (true);
CREATE POLICY "Owner manage project rundowns" ON public.project_rundowns FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- 17. Revision Requests Policies (Owner manages, admin manages)
CREATE POLICY "Owner manage revision requests" ON public.revision_requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins manage revision requests" ON public.revision_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 18. RSVP Policies (Public read/write, owner manages)
CREATE POLICY "Public read rsvp" ON public.rsvp FOR SELECT USING (true);
CREATE POLICY "Public insert rsvp" ON public.rsvp FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner manage rsvp" ON public.rsvp FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- 19. WA Blast Logs Policies (Owner manages)
CREATE POLICY "Owner manage wa blast logs" ON public.wa_blast_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- ============================================================================
-- STORAGE BUCKET CREATION & POLICIES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('undangan', 'undangan', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner Update" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;

-- public select
CREATE POLICY "Public Access" ON storage.objects FOR SELECT
  USING (bucket_id = 'undangan');

-- authenticated upload
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'undangan' AND auth.role() = 'authenticated');

-- owner update/delete
CREATE POLICY "Owner Update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'undangan' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner Delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'undangan' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================================
-- ENABLE SUPABASE REALTIME
-- ============================================================================
-- Supabase Realtime utilizes PostgreSQL publications. We add the 'projects' table
-- to the 'supabase_realtime' publication to allow real-time listeners.
-- We also enable it for checkins, rsvp, and guestbook_entries for interactive live features.

-- Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvp;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guestbook_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkins;

