import type { Event } from "../types";

export function sortEventsByStart(events: Event[]): Event[] {
  return [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

export function filterFutureEvents(events: Event[], nowTs: number): Event[] {
  return sortEventsByStart(events).filter((event) => event.startDate.getTime() >= nowTs);
}

export function getCountdownParts(targetDate: Date, nowTs: number) {
  const diffMs = Math.max(0, targetDate.getTime() - nowTs);
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / (24 * 60));
  const hours = Math.floor((totalMins % (24 * 60)) / 60);
  const mins = totalMins % 60;

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    mins: String(mins).padStart(2, "0"),
  };
}
