export const NOTIFICATION_INBOX_CHANGE_EVENT = "huestima-notification-inbox-change";

const STORAGE_KEY = "huestima-notification-inbox-v1";
const EMPTY_INBOX = { seenIds: [], readIds: [] };
const USER_NOTIFICATION_RETENTION_MS = 24 * 60 * 60 * 1000;

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
      readAt: normalizeReadAt(parsed?.readAt),
    };
  } catch {
    return EMPTY_INBOX;
  }
}

function normalizeReadAt(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([id, timestamp]) =>
      typeof id === "string" && id && Number.isFinite(Number(timestamp)),
    ),
  );
}

function writeNotificationInbox(nextInbox) {
  if (typeof window === "undefined") return nextInbox;

  const cleanInbox = {
    seenIds: normalizeIds(nextInbox?.seenIds),
    readIds: normalizeIds(nextInbox?.readIds),
    readAt: normalizeReadAt(nextInbox?.readAt),
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
  if (inbox.readIds.includes(id) && Number.isFinite(Number(inbox.readAt?.[id]))) return inbox;
  return writeNotificationInbox({
    ...inbox,
    readIds: [...new Set([...inbox.readIds, id])],
    readAt: { ...inbox.readAt, [id]: Date.now() },
  });
}

export function markAllNotificationsRead(ids) {
  const inbox = readNotificationInbox();
  const idsToMark = normalizeIds(ids);
  const now = Date.now();
  const nextIds = [...new Set([...inbox.readIds, ...idsToMark])];
  const nextReadAt = { ...inbox.readAt };
  idsToMark.forEach((id) => {
    if (!Number.isFinite(Number(nextReadAt[id]))) nextReadAt[id] = now;
  });
  return writeNotificationInbox({ ...inbox, readIds: nextIds, readAt: nextReadAt });
}

export function isNotificationVisibleToUser(id, inbox = readNotificationInbox(), now = Date.now()) {
  const readAt = Number(inbox?.readAt?.[id]);
  return !Number.isFinite(readAt) || now - readAt < USER_NOTIFICATION_RETENTION_MS;
}
