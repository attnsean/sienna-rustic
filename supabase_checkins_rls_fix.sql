-- Fix RLS permissions for checkins table to allow anonymous selects from standard clients
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read checkins" ON public.checkins;
CREATE POLICY "Public read checkins" ON public.checkins FOR SELECT USING (true);
