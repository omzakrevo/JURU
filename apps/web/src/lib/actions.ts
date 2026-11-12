import { parseRpcError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

export interface ActionState { error?: string; ok?: boolean; message?: string; data?: unknown }

/** Appelle une RPC avec le JWT de l'utilisateur ; renvoie { data } ou { error } lisible. */
export async function callRpc<T = unknown>(name: string, args: Record<string, unknown> = {}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(name, args);
  if (error) return { error: parseRpcError(error), data: null as T | null };
  return { error: null, data: data as T };
}

export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === 'string' ? v.trim() : '';
};
export const intOf = (fd: FormData, k: string) => {
  const digits = str(fd, k).replace(/[^\d-]/g, '');
  return digits === '' ? NaN : parseInt(digits, 10);
};
export const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
