import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ujiqdozsipxwjrugtsgd.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_jfhrpcWLhECHJEnE1AhiaQ_zgDT7D4R';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// ============================================================================
// WA Blast Quota helpers (table: public.wa_blast_quotas)
// ============================================================================
const PACKAGE_QUOTA_DEFAULTS: Record<string, { has_wa_blast: boolean; max_wa_blast: number; has_dashboard: boolean }> = {
  basic: { has_wa_blast: false, max_wa_blast: 0, has_dashboard: false },
  silver: { has_wa_blast: true, max_wa_blast: 100, has_dashboard: true },
  premium: { has_wa_blast: true, max_wa_blast: 300, has_dashboard: true },
  exclusive: { has_wa_blast: true, max_wa_blast: 500, has_dashboard: true },
};

const QUOTA_KEYS = [
  'package_name',
  'has_wa_blast',
  'max_wa_blast',
  'extra_wa_blast',
  'used_wa_blast',
  'has_removed_watermark',
  'has_dashboard',
] as const;

const normalizePackage = (name?: string | null) => {
  const n = String(name || '').toLowerCase().trim();
  if (n === 'exclutif') return 'exclusive';
  return PACKAGE_QUOTA_DEFAULTS[n] ? n : 'silver';
};

const isMissingTableError = (err: any) =>
  !!err && (err.code === '42P01' || err.code === 'PGRST205' || err.code === 'PGRST202' || /does not exist|could not find/i.test(err.message || ''));

const parseJsonObject = (raw: any): Record<string, any> => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const logQuotaTransaction = async (row: Record<string, any>) => {
  try {
    await supabaseAdmin.from('wa_blast_quota_transactions').insert(row);
  } catch (e) {
    console.error('Failed to log WA blast quota transaction:', e);
  }
};

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
          .select('id, project_name, status, subscriptions(status, packages(name, max_wa_blast))')
          .eq('id', project_id)
          .maybeSingle();

        const { data: weddingData } = await supabaseAdmin
          .from('wedding_details')
          .select('dining_schedule')
          .eq('project_id', project_id)
          .maybeSingle();

        const { count: sentCount } = await supabaseAdmin
          .from('wa_blast_logs')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project_id)
          .eq('status', 'sent');

        const { count: failedCount } = await supabaseAdmin
          .from('wa_blast_logs')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project_id)
          .eq('status', 'failed');

        const { data: recentLogs } = await supabaseAdmin
          .from('wa_blast_logs')
          .select('id, phone, message, status, created_at')
          .eq('project_id', project_id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        // WA Blast quota (new table) merged on top of legacy dining_schedule JSON
        const legacyConfig = parseJsonObject(weddingData?.dining_schedule);
        let quotaRow: Record<string, any> | null = null;
        const { data: existingQuota, error: quotaErr } = await supabaseAdmin
          .from('wa_blast_quotas')
          .select('*')
          .eq('project_id', project_id)
          .maybeSingle();

        if (!quotaErr) {
          quotaRow = existingQuota;
          // Auto-create quota row so every invitation appears in admin dashboard
          if (!quotaRow && data) {
            const subPkgs: any = (data as any)?.subscriptions?.packages ?? (Array.isArray((data as any)?.subscriptions) ? (data as any).subscriptions[0]?.packages : null);
            const subPkgName = Array.isArray(subPkgs) ? subPkgs[0]?.name : subPkgs?.name;
            const pkg = normalizePackage(legacyConfig.package_name || subPkgName);
            const defaults = PACKAGE_QUOTA_DEFAULTS[pkg];
            const insertRow = {
              project_id,
              package_name: pkg,
              has_wa_blast: typeof legacyConfig.has_wa_blast === 'boolean' ? legacyConfig.has_wa_blast : defaults.has_wa_blast,
              max_wa_blast: typeof legacyConfig.max_wa_blast === 'number' ? legacyConfig.max_wa_blast : defaults.max_wa_blast,
              extra_wa_blast: typeof legacyConfig.extra_wa_blast === 'number' ? legacyConfig.extra_wa_blast : 0,
              used_wa_blast: Math.max(Number(legacyConfig.used_wa_blast) || 0, sentCount || 0),
              has_removed_watermark: Boolean(legacyConfig.has_removed_watermark),
              has_dashboard: typeof legacyConfig.has_dashboard === 'boolean' ? legacyConfig.has_dashboard : defaults.has_dashboard,
            };
            const { data: created, error: createErr } = await supabaseAdmin
              .from('wa_blast_quotas')
              .upsert(insertRow, { onConflict: 'project_id' })
              .select('*')
              .single();
            if (!createErr && created) {
              quotaRow = created;
              await logQuotaTransaction({
                project_id,
                type: 'initial',
                amount: created.max_wa_blast + created.extra_wa_blast,
                package_after: created.package_name,
                max_after: created.max_wa_blast,
                extra_after: created.extra_wa_blast,
                note: 'Kuota awal dibuat otomatis',
                created_by: 'system',
              });
            }
          }
        } else if (!isMissingTableError(quotaErr)) {
          console.error('wa_blast_quotas read error:', quotaErr);
        }

        const quotaFields = quotaRow
          ? {
              package_name: quotaRow.package_name,
              has_wa_blast: quotaRow.has_wa_blast,
              max_wa_blast: quotaRow.max_wa_blast,
              extra_wa_blast: quotaRow.extra_wa_blast,
              used_wa_blast: quotaRow.used_wa_blast,
              total_wa_blast: quotaRow.total_wa_blast,
              available_wa_blast: quotaRow.available_wa_blast,
              has_removed_watermark: quotaRow.has_removed_watermark,
              has_dashboard: quotaRow.has_dashboard,
            }
          : {};
        const mergedConfig = { ...legacyConfig, ...quotaFields };

        return NextResponse.json({
          success: true,
          data: {
            ...data,
            blast_config: Object.keys(mergedConfig).length > 0 ? mergedConfig : null,
            quota_source: quotaRow ? 'wa_blast_quotas' : 'legacy',
            sent_count: sentCount || 0,
            failed_count: failedCount || 0,
            recent_logs: recentLogs || []
          }
        });
      }

      case 'get_blast_logs': {
        const { project_id } = payload;
        const { data: logs, error } = await supabaseAdmin
          .from('wa_blast_logs')
          .select('*')
          .eq('project_id', project_id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        return NextResponse.json({ success: true, data: logs });
      }

      case 'save_blast_log': {
        const { project_id, phone, message, status, guest_id } = payload;
        const { data, error } = await supabaseAdmin
          .from('wa_blast_logs')
          .insert({
            project_id,
            guest_id: guest_id || null,
            phone,
            message,
            status: status || 'sent'
          })
          .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }

      case 'update_blast_config': {
        const { project_id, config = {} } = payload;
        const {
          increment_used_wa_blast,
          add_extra_wa_blast,
          total_wa_blast: _total,
          available_wa_blast: _available,
          last_synced_at: _synced,
          ...rest
        } = config as Record<string, any>;

        // Split: quota fields -> wa_blast_quotas, others (guest_list, template) -> dining_schedule
        const quotaPatch: Record<string, any> = {};
        const otherPatch: Record<string, any> = {};
        Object.entries(rest).forEach(([k, v]) => {
          if ((QUOTA_KEYS as readonly string[]).includes(k)) quotaPatch[k] = v;
          else otherPatch[k] = v;
        });
        if (quotaPatch.package_name !== undefined) {
          quotaPatch.package_name = normalizePackage(quotaPatch.package_name);
        }

        let quotaTableReady = true;
        let quotaRow: Record<string, any> | null = null;

        const hasQuotaWork =
          Object.keys(quotaPatch).length > 0 ||
          typeof increment_used_wa_blast === 'number' ||
          typeof add_extra_wa_blast === 'number';

        if (hasQuotaWork) {
          const { data: before, error: beforeErr } = await supabaseAdmin
            .from('wa_blast_quotas')
            .select('*')
            .eq('project_id', project_id)
            .maybeSingle();

          if (beforeErr && isMissingTableError(beforeErr)) {
            quotaTableReady = false;
          } else {
            if (beforeErr) throw beforeErr;

            if (Object.keys(quotaPatch).length > 0) {
              const { data: upserted, error: upErr } = await supabaseAdmin
                .from('wa_blast_quotas')
                .upsert({ project_id, ...quotaPatch }, { onConflict: 'project_id' })
                .select('*')
                .single();
              if (upErr) throw upErr;
              quotaRow = upserted;

              // History log for meaningful changes
              if (quotaPatch.package_name && before?.package_name !== quotaPatch.package_name) {
                await logQuotaTransaction({
                  project_id,
                  type: 'package_change',
                  amount: (upserted.max_wa_blast ?? 0) - (before?.max_wa_blast ?? 0),
                  package_before: before?.package_name ?? null,
                  package_after: upserted.package_name,
                  max_before: before?.max_wa_blast ?? null,
                  max_after: upserted.max_wa_blast,
                  note: 'Upgrade paket via voucher di dashboard undangan',
                  created_by: 'user-dashboard',
                });
              }
              if (quotaPatch.has_removed_watermark === true && !before?.has_removed_watermark) {
                await logQuotaTransaction({ project_id, type: 'watermark', amount: 0, note: 'Hapus watermark via voucher', created_by: 'user-dashboard' });
              }
              if (quotaPatch.has_dashboard === true && before && !before.has_dashboard) {
                await logQuotaTransaction({ project_id, type: 'dashboard_unlock', amount: 0, note: 'Buka menu dashboard via voucher', created_by: 'user-dashboard' });
              }
            }

            if (typeof add_extra_wa_blast === 'number' && add_extra_wa_blast !== 0) {
              const { data: added, error: addErr } = await supabaseAdmin.rpc('add_wa_blast_quota', {
                p_project_id: project_id,
                p_amount: add_extra_wa_blast,
                p_note: 'Beli kuota tambahan via voucher di dashboard undangan',
                p_created_by: 'user-dashboard',
                p_type: 'voucher_quota',
              });
              if (addErr) throw addErr;
              quotaRow = added;
            }

            if (typeof increment_used_wa_blast === 'number' && increment_used_wa_blast !== 0) {
              const { data: inc, error: incErr } = await supabaseAdmin.rpc('increment_wa_blast_used', {
                p_project_id: project_id,
                p_count: increment_used_wa_blast,
              });
              if (incErr) throw incErr;
              quotaRow = inc;
            }
          }
        }

        // Legacy JSON storage: guest list & template always; quota fields only if new table missing
        const legacyPatch: Record<string, any> = { ...otherPatch };
        if (!quotaTableReady) {
          Object.assign(legacyPatch, quotaPatch);
        }

        let mergedLegacy: Record<string, any> | null = null;
        if (Object.keys(legacyPatch).length > 0 || (!quotaTableReady && (increment_used_wa_blast || add_extra_wa_blast))) {
          const { data: existing } = await supabaseAdmin
            .from('wedding_details')
            .select('dining_schedule')
            .eq('project_id', project_id)
            .maybeSingle();

          const current = parseJsonObject(existing?.dining_schedule);
          if (!quotaTableReady) {
            if (typeof increment_used_wa_blast === 'number') {
              legacyPatch.used_wa_blast = (Number(current.used_wa_blast) || 0) + increment_used_wa_blast;
            }
            if (typeof add_extra_wa_blast === 'number') {
              legacyPatch.extra_wa_blast = (Number(current.extra_wa_blast) || 0) + add_extra_wa_blast;
            }
          }

          mergedLegacy = {
            ...current,
            ...legacyPatch,
            last_synced_at: new Date().toISOString()
          };

          const { error } = await supabaseAdmin
            .from('wedding_details')
            .update({ dining_schedule: mergedLegacy })
            .eq('project_id', project_id);

          if (error) throw error;
        }

        return NextResponse.json({
          success: true,
          data: { quota: quotaRow, quota_source: quotaTableReady ? 'wa_blast_quotas' : 'legacy' }
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
