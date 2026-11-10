import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { Ticket, listMyTickets } from './tickets';

/**
 * Pelacak balasan admin untuk user:
 * - "belum dibaca" = tiket berstatus dibalas yang balasannya belum dibuka di perangkat ini
 * - "sudah diingatkan" = pengingat suara sudah diputar untuk balasan tersebut
 * Kunci memakai updated_at tiket, jadi balasan admin berikutnya dihitung sebagai balasan baru.
 */
const SEEN_KEY = 'jg_ticket_seen';
const REMINDED_KEY = 'jg_ticket_reminded';
const CHANGE_EVENT = 'jg-tickets-seen';
const POLL_MS = 60000;

const readMap = (key: string): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; }
};
const writeMap = (key: string, map: Record<string, string>) => {
  try { localStorage.setItem(key, JSON.stringify(map)); } catch { /* storage diblokir */ }
};

/** Tandai balasan tiket sudah dibuka user (dipanggil dari halaman chat tiket). */
export function markTicketSeen(t: Pick<Ticket, 'id' | 'updated_at'>) {
  const m = readMap(SEEN_KEY);
  if (m[t.id] === t.updated_at) return;
  m[t.id] = t.updated_at;
  writeMap(SEEN_KEY, m);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Tandai pengingat suara sudah diputar untuk balasan-balasan ini. */
export function markTicketsReminded(tickets: Pick<Ticket, 'id' | 'updated_at'>[]) {
  const m = readMap(REMINDED_KEY);
  tickets.forEach(t => { m[t.id] = t.updated_at; });
  writeMap(REMINDED_KEY, m);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export const isTicketUnread = (t: Ticket, seen = readMap(SEEN_KEY)) => t.status === 'dibalas' && seen[t.id] !== t.updated_at;

export function useTicketNotifications(userId: string, enabled: boolean) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled || !userId) return;
    try { setTickets(await listMyTickets(userId)); } catch { /* migrasi belum jalan → tanpa indikator */ }
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled || !userId) { setTickets([]); return; }
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    const onChange = () => setVersion(v => v + 1);
    window.addEventListener('focus', onFocus);
    window.addEventListener(CHANGE_EVENT, onChange);
    const ch = supabase
      .channel(`my-tickets-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${userId}` }, () => refresh())
      .subscribe();
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(CHANGE_EVENT, onChange);
      supabase.removeChannel(ch);
    };
  }, [enabled, userId, refresh]);

  return useMemo(() => {
    const seen = readMap(SEEN_KEY);
    const reminded = readMap(REMINDED_KEY);
    const unread = tickets.filter(t => isTicketUnread(t, seen));
    const toRemind = unread.filter(t => reminded[t.id] !== t.updated_at);
    return { tickets, unread, unreadCount: unread.length, toRemind, refresh };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, version, refresh]);
}
