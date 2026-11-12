/**
 * Edge Function — envoi des notifications SMS / push en file d'attente (table notifications).
 * À planifier toutes les minutes (pg_cron + pg_net, ou cron du VPS) avec l'en-tête Authorization: Bearer <NOTIFY_CRON_TOKEN>.
 *
 * SMS Bus actif dès que SMSBUS_ID est défini ; sinon les notifications restent « pending » (réessai) puis « failed » après 5 tentatives.
 * Push (FCM) : non branché.
 * SMS : SMS Bus (`_shared/smsbus.ts`). Push : Firebase Cloud Messaging (compte de service).
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { loadSmsConfig, sendSms } from '../_shared/smsbus.ts';

interface Notif { id: string; user_id: string; channel: 'sms' | 'push'; title: string; body: string; attempts: number }

async function sendPush(_tokens: string[], _title: string, _body: string): Promise<void> {
  if (!Deno.env.get('FCM_PROJECT_ID')) throw new Error('FCM_NOT_CONFIGURED');
  throw new Error('FCM_NOT_IMPLEMENTED'); // FCM HTTP v1 : jeton OAuth2 du compte de service
}

Deno.serve(async (req) => {
  if (req.headers.get('authorization') !== `Bearer ${Deno.env.get('NOTIFY_CRON_TOKEN')}` || !Deno.env.get('NOTIFY_CRON_TOKEN'))
    return new Response('Unauthorized', { status: 401 });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data } = await supabase.from('notifications').select('id,user_id,channel,title,body,attempts')
    .eq('status', 'pending').in('channel', ['sms', 'push']).lte('scheduled_at', new Date().toISOString()).limit(50);
  let sent = 0, failed = 0;
  for (const n of (data ?? []) as Notif[]) {
    try {
      if (n.channel === 'sms') {
        const { data: p } = await supabase.from('profiles').select('phone').eq('id', n.user_id).single();
        await sendSms(loadSmsConfig((k) => Deno.env.get(k)), p!.phone!, `${n.title} — ${n.body}`);
      } else {
        const { data: t } = await supabase.from('device_tokens').select('token').eq('user_id', n.user_id);
        await sendPush((t ?? []).map((x: { token: string }) => x.token), n.title, n.body);
      }
      await supabase.from('notifications').update({ status: 'sent', sent_at: new Date().toISOString(), attempts: n.attempts + 1 }).eq('id', n.id);
      sent++;
    } catch (e) {
      const attempts = n.attempts + 1;
      await supabase.from('notifications').update({ attempts, last_error: String((e as Error).message), status: attempts >= 5 ? 'failed' : 'pending' }).eq('id', n.id);
      failed++;
    }
  }
  return new Response(JSON.stringify({ sent, failed }), { headers: { 'Content-Type': 'application/json' } });
});
