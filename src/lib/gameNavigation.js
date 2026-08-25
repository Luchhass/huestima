export const LEAVE_ACTIVE_GAME_EVENT = "huestima:leave-active-game";

export async function requestActiveGameExit() {
  const pending = [];
  const waitUntil = (promise) => {
    if (promise) pending.push(Promise.resolve(promise));
  };

  window.dispatchEvent(
    new CustomEvent(LEAVE_ACTIVE_GAME_EVENT, { detail: { waitUntil } }),
  );

  if (pending.length) {
    await Promise.allSettled(pending);
  }
}
