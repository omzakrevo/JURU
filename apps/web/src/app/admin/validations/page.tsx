import { DecisionForm } from '@/components/DecisionForm';
import { ActionForm } from '@/components/ActionForm';
import { Alert, Card, EmptyState, Field, Input, PageHeader, Select, StatusBadge } from '@/components/ui';
import { adminPage } from '@/lib/admin';
import { formatDateTime } from '@/lib/dates';
import { decideApproval, requestRoleGrant } from '@/app/actions/admin';
import { ROLE_LABELS } from '@/lib/roles';

type A = { id: string; action_type: string; entity_id: string; payload: Record<string, unknown>; requested_by: string; status: string; approved_by: string | null; created_at: string; expires_at: string };

export default async function Page() {
  const { s, supabase } = await adminPage('validations');
  const { data } = await supabase.from('approval_requests').select('*').order('created_at', { ascending: false }).limit(50);
  const rows = (data ?? []) as A[];
  return (
    <>
      <PageHeader title="Double validation" subtitle="Les opérations sensibles requièrent l’accord d’un second responsable. Le demandeur ne peut pas valider sa propre demande." />
      {rows.length === 0 ? <EmptyState title="Aucune demande" /> : <div className="space-y-4">{rows.map((a) => (
        <Card key={a.id}><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{a.action_type === 'disbursement' ? 'Décaissement (simulation)' : 'Attribution de rôle'}</p>
          <p className="text-sm text-muted">{a.action_type === 'disbursement' ? `Net : ${(a.payload.net_amount as number)?.toLocaleString('fr-FR')} FCFA` : `Rôle : ${ROLE_LABELS[a.payload.role as keyof typeof ROLE_LABELS] ?? a.payload.role}`} · demandé {formatDateTime(a.created_at)} · expire {formatDateTime(a.expires_at)}</p></div><StatusBadge status={a.status} /></div>
          {a.status === 'pending' && (a.requested_by === s.userId ? <p className="mt-3 text-sm text-muted">Vous avez initié cette demande : un autre responsable doit la valider.</p>
            : <div className="mt-4 border-t border-border pt-4"><DecisionForm action={decideApproval} id={a.id} field="note" reasonLabel="Note (facultative)" yes={['approve', 'Approuver']} no={['reject', 'Rejeter']} /></div>)}</Card>))}</div>}
      {s.roles.includes('super_admin') && <Card className="mt-8"><h2 className="mb-1 font-semibold">Attribuer un rôle (double validation)</h2><p className="mb-3 text-sm text-muted">Nécessite l’approbation d’un autre super administrateur.</p>
        <ActionForm action={requestRoleGrant} submit="Soumettre" variant="outline"><div className="grid gap-3 sm:grid-cols-2"><Field label="ID utilisateur (UUID)"><Input name="user_id" required /></Field><Field label="Rôle"><Select name="role">{Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field></div></ActionForm></Card>}
      <div className="mt-4"><Alert tone="info">Le basculement vers les paiements réels (<code>payments_live_enabled</code>) n’est volontairement pas disponible dans l’interface : il se fait par intervention DBA documentée, après validation juridique.</Alert></div>
    </>
  );
}
