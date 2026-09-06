import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { reconcileAlarmsWithEvents } from './alarmSync';
import { fetchEventsForAccounts } from './calendarService';
import { getAccounts } from './googleAuth';

const TASK_NAME = 'calsync-alarm-reconcile';

// Must be defined at module scope, not inside a component - iOS spins up a
// headless JS runtime to run this without the app being open.
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const accounts = await getAccounts();
    if (accounts.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }
    const { events, cancelledEventIds } = await fetchEventsForAccounts(accounts);
    await reconcileAlarmsWithEvents(events, cancelledEventIds);
    console.log('[backgroundSync] reconcile pass complete');
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (err) {
    console.warn('[backgroundSync] reconcile pass failed', err);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Registers the reconcile task to run opportunistically in the background.
 * iOS treats `minimumInterval` as a floor, not a schedule - it may run far
 * less often depending on battery, network, and usage patterns. This is a
 * best-effort supplement to the guaranteed foreground reconcile-on-open, not
 * a replacement for it.
 */
export async function registerBackgroundSync(): Promise<void> {
  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (alreadyRegistered) return;
  await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 60 });
}
