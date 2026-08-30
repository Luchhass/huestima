export const NOTIFICATION_INBOX_CHANGE_EVENT = "huestima-notification-inbox-change";

const STORAGE_KEY = "huestima-notification-inbox-v1";
const EMPTY_INBOX = { seenIds: [], readIds: [] };

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === "string" && item))].slice(-250);
}

export function readNotificationInbox() {
  if (typeof window === "undefined") return EMPTY_INBOX;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      seenIds: normalizeIds(parsed?.seenIds),
      readIds: normalizeIds(parsed?.readIds),
    };
  } catch {
    return EMPTY_INBOX;
  }
}

function writeNotificationInbox(nextInbox) {
  if (typeof window === "undefined") return nextInbox;

  const cleanInbox = {
    seenIds: normalizeIds(nextInbox?.seenIds),
    readIds: normalizeIds(nextInbox?.readIds),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanInbox));
  } catch {}

  window.dispatchEvent(new Event(NOTIFICATION_INBOX_CHANGE_EVENT));
  return cleanInbox;
}

export function markNotificationSeen(id) {
  if (!id) return readNotificationInbox();
  const inbox = readNotificationInbox();
  if (inbox.seenIds.includes(id)) return inbox;
  return writeNotificationInbox({ ...inbox, seenIds: [...inbox.seenIds, id] });
}

export function markNotificationRead(id) {
  if (!id) return readNotificationInbox();
  const inbox = readNotificationInbox();
  if (inbox.readIds.includes(id)) return inbox;
  return writeNotificationInbox({ ...inbox, readIds: [...inbox.readIds, id] });
}

export function markAllNotificationsRead(ids) {
  const inbox = readNotificationInbox();
  const nextIds = [...new Set([...inbox.readIds, ...normalizeIds(ids)])];
  if (nextIds.length === inbox.readIds.length) return inbox;
  return writeNotificationInbox({ ...inbox, readIds: nextIds });
}
