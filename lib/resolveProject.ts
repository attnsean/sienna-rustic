import { supabase as publicSupabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ujiqdozsipxwjrugtsgd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use admin client if running on server with service role key to bypass RLS for subscriptions
const supabase = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : publicSupabase;

export const isDefaultStorageUrl = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string') return false;
  const decoded = decodeURIComponent(url).toLowerCase();
  return (
    decoded.includes('/undangan/defaults') ||
    decoded.includes('/website serastory') ||
    decoded.includes('a3e99edc-aab7-4a84-b0c6-986a2fd0b0bf/a99bab7e-6ed3-48f5-bc1d-23f134794f20') ||
    decoded.includes('/image/pre-wedding/1.jpg') ||
    decoded.includes('/image/pre-wedding/2.jpg') ||
    decoded.includes('/image/pre-wedding/3.jpg') ||
    decoded.includes('/image/pre-wedding/4.jpg') ||
    decoded.includes('/image/pre-wedding/5.jpg') ||
    decoded.includes('/image/pre-wedding/groom.jpg') ||
    decoded.includes('/image/pre-wedding/bride.jpg')
  );
};

export interface DbGuest {
  id: string;
  project_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  group_name?: string | null;
  seat_label?: string | null;
  invitation_slug?: string | null;
  is_vip: boolean;
  notes?: string | null;
  created_at: string;
}

export interface DbProject {
  id: string;
  user_id: string;
  subscription_id?: string | null;
  template_id: string;
  project_name: string;
  github_repo?: string | null;
  site_url?: string | null;
  custom_domain?: string | null;
  status: string;
  bride_name?: string | null;
  groom_name?: string | null;
  wedding_date?: string | null;
  wedding_time?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  venue_maps_url?: string | null;
  color_theme?: string | null;
  font_choice?: string | null;
  music_url?: string | null;
  love_story?: string | null;
  photo_urls?: string[] | null;
  video_urls?: string[] | null;
  events?: unknown;
  rundown?: unknown;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  bride_nickname?: string | null;
  bride_father?: string | null;
  bride_father_deceased?: boolean | null;
  bride_mother?: string | null;
  bride_mother_deceased?: boolean | null;
  groom_nickname?: string | null;
  groom_father?: string | null;
  groom_father_deceased?: boolean | null;
  groom_mother?: string | null;
  groom_mother_deceased?: boolean | null;
  bride_instagram?: string | null;
  groom_instagram?: string | null;
  bride_photo_url?: string | null;
  groom_photo_url?: string | null;
  religion?: string | null;
  gallery_photos?: unknown;
  cover_photo_url?: string | null;
  opening_photo_url?: string | null;
  love_story_items?: unknown;
  live_stream_url?: string | null;
  live_stream_label?: string | null;
  payment_accounts?: unknown;
  wishlist_url?: string | null;
  wishlist_note?: string | null;
  health_protocol?: string | null;
  hashtag?: string | null;
  countdown_target?: string | null;
  wizard_step: number;
  wizard_completed: boolean;
  subscriptions?: {
    status: string;
    expires_at?: string | null;
    packages: {
      has_rsvp: boolean;
      has_amplop_digital: boolean;
      has_guestbook: boolean;
      has_live_slideshow: boolean;
      has_ganti_warna: boolean;
      has_ganti_font: boolean;
      has_kombinasi_desain: boolean;
      has_rsvp_custom: boolean;
      has_rundown: boolean;
      has_love_story: boolean;
      has_hitung_mundur: boolean;
      has_request_musik: boolean;
      has_free_reschedule: boolean;
    } | null;
  } | null;
}

export interface DbEvent {
  id: string;
  project_id: string;
  event_type: string;
  custom_label?: string | null;
  event_date: string;
  event_time?: string | null;
  end_time?: string | null;
  venue_name: string;
  venue_address?: string | null;
  venue_maps_url?: string | null;
  venue_photo_url?: string | null;
  dresscode?: string | null;
  notes?: string | null;
  sort_order: number;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DbWish {
  id: string;
  project_id: string;
  guest_id?: string | null;
  name: string;
  message: string;
  is_approved: boolean;
  created_at: string;
}

export interface ResolvedData {
  guest: DbGuest | null;
  project: DbProject | null;
  events: DbEvent[] | null;
  wishes: DbWish[] | null;
  stats: {
    attending: number;
    wishes: number;
  };
}

export async function resolveProjectData(slug?: string, host?: string): Promise<ResolvedData> {
  const result: ResolvedData = {
    guest: null,
    project: null,
    events: null,
    wishes: null,
    stats: { attending: 156, wishes: 43 } // UI defaults
  };

  try {
    let projectId = process.env.NEXT_PUBLIC_PROJECT_ID || '';
    if (projectId === 'undefined') {
      projectId = '';
    }

    // 1. Resolve guest by slug if provided
    if (slug) {
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .select('*')
        .eq('invitation_slug', slug)
        .maybeSingle();

      if (guestData && !guestError) {
        result.guest = guestData;
        projectId = guestData.project_id;
      }
    }

    // 2. If no guest slug matched, try to resolve by host
    if (!projectId && host) {
      // Find project where site_url or custom_domain contains host
      const { data: matchedProjects } = await supabase
        .from('projects')
        .select('id')
        .or(`site_url.ilike.%${host}%,custom_domain.ilike.%${host}%`)
        .limit(1);

      if (matchedProjects && matchedProjects.length > 0) {
        projectId = matchedProjects[0].id;
      }
    }

    // 3. Fetch project details
    if (projectId) {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*, subscriptions(status, expires_at, packages(*))')
        .eq('id', projectId)
        .maybeSingle();

      if (projectData && !projectError) {
        const { data: weddingData } = await supabase
          .from('wedding_details')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle();

        result.project = {
          ...projectData,
          ...(weddingData || {}),
          id: projectData.id,
          project_id: projectData.id,
          wedding_details_id: weddingData?.id
        };

        // Filter out default template storage assets from gallery_photos
        if (result.project && Array.isArray(result.project.gallery_photos)) {
          result.project.gallery_photos = (result.project.gallery_photos as (string | { url?: string; public_url?: string })[])
            .filter((item) => {
              const url = typeof item === 'string' ? item : item?.url || item?.public_url || '';
              return url && !isDefaultStorageUrl(url);
            });
        }

        // 4. Fetch events
        const { data: eventsData } = await supabase
          .from('project_events')
          .select('*')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true });

        result.events = eventsData || [];

        // Fallback for wedding_date if null
        if (result.project && !result.project.wedding_date) {
          if (result.project.countdown_target) {
            result.project.wedding_date = result.project.countdown_target.split('T')[0];
          } else if (result.events && result.events.length > 0) {
            result.project.wedding_date = result.events[0].event_date;
          }
        }

        // 5. Fetch wishes (approved guestbook entries)
        const { data: wishesData } = await supabase
          .from('guestbook_entries')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_approved', true)
          .order('created_at', { ascending: false });

        result.wishes = wishesData || [];

        // 5.5 Fetch love story items
        const { data: loveStoryData } = await supabase
          .from('love_story_items')
          .select('*')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true });

        if (result.project) {
          result.project.love_story_items = (loveStoryData || []).map(item => ({
            id: item.id,
            year: item.year,
            title: item.title,
            desc: item.description,
            order: item.sort_order
          }));
        }

        // 6. Fetch RSVP attendance stats (attending sum)
        const { data: rsvpData } = await supabase
          .from('rsvp')
          .select('pax')
          .eq('project_id', projectId)
          .eq('attendance', 'hadir');

        const totalAttending = rsvpData?.reduce((acc, curr) => acc + (curr.pax || 1), 0) || 0;

        result.stats = {
          attending: totalAttending > 0 ? totalAttending : 156, // fallback to mock UI default if 0
          wishes: result.wishes ? result.wishes.length : 43
        };
      }
    }
  } catch (error) {
    console.error('Error resolving project data from Supabase:', error);
  }

  return result;
}
