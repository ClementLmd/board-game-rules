export const NOTIFICATIONS_READ_EVENT = 'notifications:read';

export function dispatchNotificationsRead(detail: { all?: boolean } = {}) {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT, { detail }));
}
