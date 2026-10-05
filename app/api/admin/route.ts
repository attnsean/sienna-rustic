import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(request: Request) {
  try {
    const { action, payload } = await request.json();

    if (!action || !payload) {
      return NextResponse.json({ error: 'Missing action or payload' }, { status: 400 });
    }

    switch (action) {
      case 'add_gift': {
        const { project_id, name, price, original_price, discount_label, image_url } = payload;
        const { data, error } = await supabaseAdmin
          .from('gift_registry')
          .insert({
            project_id,
            name,
            price,
            original_price,
            discount_label,
            image_url,
            is_bought: false
          })
          .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }

      case 'update_gift': {
        const { id, name, price, original_price, discount_label, image_url, is_bought } = payload;
        const { data, error } = await supabaseAdmin
          .from('gift_registry')
          .update({
            name,
            price,
            original_price,
            discount_label,
            image_url,
            is_bought
          })
          .eq('id', id)
          .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }

      case 'delete_gift': {
        const { id } = payload;
        const { error } = await supabaseAdmin
          .from('gift_registry')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      case 'upload_image': {
        const { project_id, file, fileName, fileType } = payload;
        const base64Data = file.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = `${project_id}/gifts/${Date.now()}-${fileName}`;

        const { data, error } = await supabaseAdmin.storage
          .from('undangan')
          .upload(filePath, buffer, {
            contentType: fileType || 'image/jpeg',
            upsert: true
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('undangan')
          .getPublicUrl(filePath);

        return NextResponse.json({ success: true, url: publicUrl });
      }

      case 'update_bot': {
        const { project_id, status, qr, action } = payload;
        const { data, error } = await supabaseAdmin
          .from('projects')
          .update({
            love_story: JSON.stringify({ status, qr, action, updatedAt: new Date().toISOString() })
          })
          .eq('id', project_id)
          .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }

      case 'add_story': {
        const { project_id, year, title, description, sort_order } = payload;
        const { data, error } = await supabaseAdmin
          .from('love_story_items')
          .insert({
            project_id,
            year,
            title,
            description,
            sort_order
          })
          .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }

      case 'delete_story': {
        const { id } = payload;
        const { error } = await supabaseAdmin
          .from('love_story_items')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      case 'queue_blast': {
        const { project_id, blasts } = payload; // blasts is array of { phone, message, guest_id }
        if (!Array.isArray(blasts)) {
          return NextResponse.json({ error: 'blasts must be an array' }, { status: 400 });
        }

        const rows = blasts.map(b => ({
          project_id,
          guest_id: b.guest_id || null,
          phone: b.phone,
          message: b.message,
          status: 'queued'
        }));

        const { data, error } = await supabaseAdmin
          .from('wa_blast_logs')
          .insert(rows)
          .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }

      case 'change_password': {
        const { project_id, password } = payload;
        const { data, error } = await supabaseAdmin
          .from('wedding_details')
          .update({ hashtag: password })
          .eq('project_id', project_id)
          .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }

      case 'delete_wish': {
        const { project_id, id, rsvp_id, name } = payload;

        if (rsvp_id) {
          const { error } = await supabaseAdmin
            .from('rsvp')
            .update({ message: '' })
            .eq('id', rsvp_id);
          if (error) throw error;
        } else if (id) {
          const { error } = await supabaseAdmin
            .from('rsvp')
            .update({ message: '' })
            .eq('guest_id', id);
          if (error) throw error;
        }

        if (id) {
          await supabaseAdmin
            .from('guestbook_entries')
            .delete()
            .eq('guest_id', id);
        }
        if (name) {
          await supabaseAdmin
            .from('guestbook_entries')
            .delete()
            .eq('project_id', project_id)
            .eq('name', name);
        }

        return NextResponse.json({ success: true });
      }

      case 'get_project_plan': {
        const { project_id } = payload;
        const { data, error } = await supabaseAdmin
          .from('projects')
          .select('id, project_name, status, subscriptions(status, packages(name))')
          .eq('id', project_id)
          .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
