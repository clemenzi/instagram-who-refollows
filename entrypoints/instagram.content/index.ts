import '../../assets/style.css';

import { createElement } from 'react';
import ReactDOM from 'react-dom/client';

import {
  CONNECTIONS,
  fetchProfiles,
  getTargetUsername,
  getUserId,
} from './api';
import Popup from './popup';
import type { ProgressUpdate, Results } from './types';
import { buildResults, delay, PAGE_DELAY_MS, publishResults } from './utils';

const RUN_MESSAGE = 'run';
type ProgressListener = (progress: ProgressUpdate) => void;

async function runInstagramAnalysis(
  onProgress: ProgressListener,
): Promise<Results> {
  onProgress({
    phase: 'target',
    message: 'Identifying the profile to analyze...',
  });
  const username = await getTargetUsername();

  console.log(`[progress] target username: ${username}`);
  onProgress({
    phase: 'user-id',
    message: `Found @${username}. Resolving the Instagram user ID...`,
  });

  const userId = await getUserId(username);
  console.log('[progress] user id resolved');
  onProgress({
    phase: 'followings',
    message: 'Reading the profiles you follow...',
  });

  const followings = await fetchProfiles(userId, CONNECTIONS.followings, {
    phase: 'followings',
    onProgress,
  });
  await delay(PAGE_DELAY_MS);
  onProgress({
    phase: 'followers',
    message: 'Reading the profiles that follow you...',
  });

  const followers = await fetchProfiles(userId, CONNECTIONS.followers, {
    phase: 'followers',
    onProgress,
  });
  const results = buildResults(followings, followers);

  publishResults(results);
  console.log('[progress] done');
  onProgress({
    phase: 'results',
    message: `Scan complete: ${results.dontFollowMeBack.length} profiles do not follow you back.`,
  });

  return results;
}

export default defineContentScript({
  matches: ['*://*.instagram.com/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    let activeRun: Promise<Results> | null = null;
    const progressListeners = new Set<ProgressListener>();
    let isPopupOpen = false;
    let runSignal = 0;
    let root: ReturnType<typeof ReactDOM.createRoot> | null = null;

    const emitProgress = (progress: ProgressUpdate) => {
      for (const listener of progressListeners) {
        listener(progress);
      }
    };

    const runOnce = (onProgress: ProgressListener) => {
      progressListeners.add(onProgress);

      activeRun ??= runInstagramAnalysis(emitProgress).finally(() => {
        activeRun = null;
        progressListeners.clear();
      });

      return activeRun.finally(() => {
        progressListeners.delete(onProgress);
      });
    };

    const renderPopup = () => {
      root?.render(
        createElement(Popup, {
          isOpen: isPopupOpen,
          runSignal,
          onClose: () => {
            isPopupOpen = false;
            renderPopup();
          },
          onRun: runOnce,
        }),
      );
    };

    const ui = await createShadowRootUi(ctx, {
      name: 'instagram-who-refollows',
      position: 'inline',
      anchor: 'body',
      isolateEvents: true,
      onMount: (container) => {
        const app = document.createElement('div');
        container.append(app);

        root = ReactDOM.createRoot(app);
        renderPopup();

        return root;
      },
      onRemove: (mountedRoot) => {
        mountedRoot?.unmount();
        root = null;
      },
    });

    ui.mount();

    browser.runtime.onMessage.addListener(async (message) => {
      if (message !== RUN_MESSAGE) {
        return;
      }

      isPopupOpen = true;
      runSignal += 1;
      renderPopup();
    });
  },
});
