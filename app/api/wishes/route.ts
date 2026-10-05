import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { project_id, guest_id, name, message } = body;

    // Self-healing: if project_id is wedding_details.id, find the real projects.id
    if (project_id) {
      const { data: proj } = await supabaseAdmin.from('projects').select('id').eq('id', project_id).maybeSingle();
      if (!proj) {
        const { data: wed } = await supabaseAdmin.from('wedding_details').select('project_id').eq('id', project_id).maybeSingle();
        if (wed?.project_id) {
          project_id = wed.project_id;
        }
      }
    }

    // Self-healing: if guest_id does not exist in guests table, nullify it to avoid foreign key violation
    if (guest_id) {
      const { data: g } = await supabaseAdmin.from('guests').select('id').eq('id', guest_id).maybeSingle();
      if (!g) {
        guest_id = null;
      }
    }

    if (!project_id || !name || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('guestbook_entries')
      .insert({
        project_id,
        guest_id: guest_id || null,
        name,
        message,
        is_approved: true
      })
      .select();

    if (error) {
      console.error('Error inserting guestbook entry:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Wishes API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
