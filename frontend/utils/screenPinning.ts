import ScreenPinning from '../modules/screen-pinning';

export { default } from '../modules/screen-pinning';

export async function enterScreenPinning(): Promise<{ success: boolean; message?: string }> {
  try {
    const success = await ScreenPinning.startLockTask();
    return {
      success,
      message: success ? 'Screen pinning started.' : 'Screen pinning could not be started.',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error starting screen pinning.',
    };
  }
}

export async function exitScreenPinning(): Promise<{ success: boolean; message?: string }> {
  try {
    const success = await ScreenPinning.stopLockTask();
    return {
      success,
      message: success ? 'Screen pinning stopped.' : 'Screen pinning could not be stopped.',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error stopping screen pinning.',
    };
  }
}
