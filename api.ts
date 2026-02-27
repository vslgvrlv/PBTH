import { Event, Team, TeamMember, Transaction, User, RSVPStatus } from './types';

// In production, this would be empty string if serving from same origin
const API_URL = 'http://localhost:3000/api'; 

export const api = {
  async getInitData(userId: string = 'u1') {
    const res = await fetch(`${API_URL}/init?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();
    
    // Convert date strings back to Date objects
    data.events = data.events.map((e: any) => ({
        ...e,
        startDate: new Date(e.startDate)
    }));
    data.transactions = data.transactions.map((t: any) => ({
        ...t,
        date: new Date(t.date)
    }));
    
    return data;
  },

  async createEvent(event: Event) {
    const res = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        startDate: event.startDate.toISOString()
      })
    });
    return res.json();
  },

  async rsvp(eventId: string, userId: string, status: RSVPStatus) {
    const res = await fetch(`${API_URL}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, userId, status })
    });
    return res.json();
  },

  async addTransaction(tx: Transaction) {
    const res = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...tx,
        date: tx.date.toISOString()
      })
    });
    return res.json();
  }
};