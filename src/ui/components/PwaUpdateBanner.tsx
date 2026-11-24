import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Non-intrusive deferred Service Worker prompt.
 * Never force-reloads mid-phase — lets the player apply updates when ready.
 */
export function PwaUpdateBanner() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  return (
    <div
      className="phase-complete-card"
      role="status"
      aria-live="polite"
      style={{ padding: '8px 12px', fontSize: '0.82rem' }}
    >
      <span>
        {needRefresh
          ? 'A new version of Oh! Shift is ready.'
          : 'Oh! Shift is cached and ready for offline travel play.'}
      </span>
      <div style={{ display: 'flex', gap: '6px' }}>
        {needRefresh && (
          <button
            type="button"
            className="btn-primary"
            style={{ minHeight: '36px', padding: '0 12px', fontSize: '0.8rem' }}
            onClick={() => void updateServiceWorker(true)}
          >
            Update
          </button>
        )}
        <button
          type="button"
          className="btn-secondary"
          style={{ minHeight: '36px', padding: '0 10px', fontSize: '0.8rem' }}
          onClick={() => {
            setOfflineReady(false);
            setNeedRefresh(false);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
