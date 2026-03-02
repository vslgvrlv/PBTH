import { Event, Team, TeamMember, Transaction, User, RSVPStatus } from './types';

const baseFromEnv = ((import.meta as any).env?.VITE_API_BASE as string | undefined)?.replace(/\/$/, '');
const API_URL = baseFromEnv ? `${baseFromEnv}/api/v1` : '/api/v1';

export type IcsInfo = {
  url: string;
  subscriptionUrl: string;
  downloadUrl: string;
  hasToken: boolean;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    credentials: 'include',
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const payload = await res.json();
      if (payload?.detail) detail = String(payload.detail);
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async getInitData() {
    const res = await fetch(`${API_URL}/init`, {
      credentials: 'include',
    });
    if (!res.ok) {
      let detail = 'Failed to fetch data';
      try {
        const payload = await res.json();
        if (payload?.detail) detail = String(payload.detail);
      } catch (_) {}
      throw new Error(`INIT_FAILED:${res.status}:${detail}`);
    }
    const data = await res.json() as {
      user?: User;
      team?: Team;
      members?: TeamMember[];
      events?: any[];
      actionRequiredEvents?: any[];
      transactions?: any[];
      noTeamYet?: boolean;
      admin?: boolean;
      [k: string]: any;
    };

    const mergedEvents = [...(data.events || []), ...(data.actionRequiredEvents || [])];
    const normalizedEvents = mergedEvents.map((e: any) => {
      const rawStart = e.startAt || e.startDate;
      const rawEnd = e.endAt || e.endDate;
      return {
      ...e,
      startAt: rawStart,
      endAt: rawEnd,
      startDate: new Date(rawStart),
      endDate: rawEnd ? new Date(rawEnd) : undefined,
      };
    });
    const normalizedTransactions = (data.transactions || []).map((t: any) => ({
      ...t,
      date: new Date(t.date),
    }));

    return {
      ...data,
      events: normalizedEvents,
      transactions: normalizedTransactions,
      members: data.members || [],
    };
  },

  async createEvent(event: Event) {
    return request(`${'/events'}`, {
      method: 'POST',
      body: {
        ...event,
        startDate: event.startDate.toISOString()
      }
    });
  },

  async rsvp(eventId: string, userId: string, status: RSVPStatus) {
    return request('/rsvp', {
      method: 'POST',
      body: { eventId, userId, status },
    });
  },

  async addTransaction(tx: Transaction) {
    const idempotencyKey = `legacy-tx-${tx.id}`.replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 128);
    return request('/transactions', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: {
        ...tx,
        date: tx.date.toISOString()
      },
    });
  },

  async getIcs(teamId?: string): Promise<IcsInfo> {
    const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
    return request<IcsInfo>(`/profile/ics${qs}`);
  },

  async rotateIcs(teamId?: string): Promise<IcsInfo> {
    const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
    return request<IcsInfo>(`/profile/ics/rotate${qs}`, { method: 'POST' });
  },

  async getFinanceOverview(teamId: string) {
    return request(`/finance/overview?teamId=${encodeURIComponent(teamId)}`);
  },

  async getFinanceMembers(teamId: string) {
    return request(`/finance/members?teamId=${encodeURIComponent(teamId)}`);
  },

  async createFinancePayment(payload: {
    teamId: string;
    amount: number;
    title: string;
    payerUserId?: string;
    eventId?: string;
    status?: 'PENDING' | 'COMPLETED';
  }) {
    const idempotencyKey = `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`.slice(0, 120);
    return request('/finance/payments', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: payload,
    });
  },

  async authTelegramWebApp(initData: string) {
    return request('/auth/telegram/webapp', {
      method: 'POST',
      body: { initData },
    });
  },
};
