// frontend/plugins/withScreenPinning.js
// Expo config plugin: injects ScreenPinningModule native code during prebuild
// v3: Full fix for runtime screen pinning failure
//   - UI thread execution for startLockTask()
//   - Pre-flight Settings.Secure check (isScreenPinningEnabled)
//   - getLockTaskModeState() for polling after dialog
//   - android:lockTaskMode="if_whitelisted" on MainActivity
//   - REORDER_TASKS permission for Samsung/LG compatibility

const { withDangerousMod, withMainApplication, withAndroidManifest } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// ScreenPinningModule.kt
// ---------------------------------------------------------------------------

const SCREEN_PINNING_MODULE_KT = `package com.securestop.app

import android.app.Activity
import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = ScreenPinningModule.NAME)
class ScreenPinningModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "ScreenPinning"
        // Settings.Secure key used by Android to store screen-pinning toggle
        private const val LOCK_TO_APP_SETTING = "lock_to_app_enabled"
    }

    override fun getName(): String = NAME

    // Check if screen pinning is enabled in Android Settings.
    // On Android 10+ this setting was removed (pinning is always user-confirmable),
    // so we return true for API 29+ to let the system dialog handle it.
    @ReactMethod
    fun isScreenPinningEnabled(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+: setting no longer exists; system always allows the dialog
                promise.resolve(true)
                return
            }
            val enabled = Settings.Secure.getInt(
                reactContext.contentResolver,
                LOCK_TO_APP_SETTING,
                0
            )
            promise.resolve(enabled == 1)
        } catch (e: Exception) {
            // If we can't read the setting, assume enabled and let startLockTask handle it
            promise.resolve(true)
        }
    }

    // Returns the current lock task mode state:
    //   0 = LOCK_TASK_MODE_NONE
    //   1 = LOCK_TASK_MODE_LOCKED  (Device Owner only)
    //   2 = LOCK_TASK_MODE_PINNED  (user-initiated screen pinning)
    @ReactMethod
    fun getLockTaskModeState(promise: Promise) {
        try {
            val am = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val state = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.lockTaskModeState
            } else {
                @Suppress("DEPRECATION")
                if (am.isInLockTaskMode) 2 else 0
            }
            promise.resolve(state)
        } catch (e: Exception) {
            promise.reject("LOCK_TASK_MODE_ERROR", e.message ?: "Unknown error")
        }
    }

    // Start lock task (screen pinning). Must run on UI thread.
    // Returns true if the system dialog was triggered.
    // NOTE: This is fire-and-forget — the system shows a confirmation dialog.
    // Use getLockTaskModeState() to poll whether the user confirmed.
    @ReactMethod
    fun startLockTask(promise: Promise) {
        val activity: Activity? = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity found")
            return
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            promise.reject("UNSUPPORTED", "Screen pinning requires Android 5.0+")
            return
        }
        // startLockTask() MUST be called on the UI thread
        activity.runOnUiThread {
            try {
                activity.startLockTask()
                promise.resolve(true)
            } catch (e: SecurityException) {
                // SecurityException: Screen pinning is disabled in Settings
                promise.reject("SCREEN_PINNING_DISABLED", "Screen pinning is not enabled in Android Settings")
            } catch (e: Exception) {
                promise.reject("START_LOCK_TASK_ERROR", e.message ?: "Unknown error")
            }
        }
    }

    // Stop lock task. Must run on UI thread.
    @ReactMethod
    fun stopLockTask(promise: Promise) {
        val activity: Activity? = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity found")
            return
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            promise.reject("UNSUPPORTED", "Screen pinning requires Android 5.0+")
            return
        }
        activity.runOnUiThread {
            try {
                activity.stopLockTask()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("STOP_LOCK_TASK_ERROR", e.message ?: "Unknown error")
            }
        }
    }

    @ReactMethod
    fun isInLockTaskMode(promise: Promise) {
        try {
            val am = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val inLockTask = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
            } else {
                @Suppress("DEPRECATION")
                am.isInLockTaskMode
            }
            promise.resolve(inLockTask)
        } catch (e: Exception) {
            promise.reject("LOCK_TASK_MODE_ERROR", e.message ?: "Unknown error")
        }
    }
}
`;

// ---------------------------------------------------------------------------
// ScreenPinningPackage.kt  (TurboReactPackage for RN 0.81 New Architecture)
// ---------------------------------------------------------------------------

const SCREEN_PINNING_PACKAGE_KT = `package com.securestop.app

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class ScreenPinningPackage : TurboReactPackage() {

    override fun getModule(name: String, context: ReactApplicationContext): NativeModule? =
        if (name == ScreenPinningModule.NAME) ScreenPinningModule(context) else null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            ScreenPinningModule.NAME to ReactModuleInfo(
                ScreenPinningModule.NAME,
                ScreenPinningModule.NAME,
                false,  // canOverrideExistingModule
                false,  // needsEagerInit
                false,  // isCxxModule
                true    // isTurboModule
            )
        )
    }
}
`;

// ---------------------------------------------------------------------------
// Config plugin: write Kotlin files
// ---------------------------------------------------------------------------

function withScreenPinningFiles(config) {
    return withDangerousMod(config, [
        'android',
        (config) => {
            const androidRoot = path.join(config.modRequest.projectRoot, 'android');
            const javaDir = path.join(
                androidRoot,
                'app', 'src', 'main', 'java', 'com', 'securestop', 'app'
            );
            fs.mkdirSync(javaDir, { recursive: true });
            fs.writeFileSync(path.join(javaDir, 'ScreenPinningModule.kt'), SCREEN_PINNING_MODULE_KT);
            fs.writeFileSync(path.join(javaDir, 'ScreenPinningPackage.kt'), SCREEN_PINNING_PACKAGE_KT);
            return config;
        },
    ]);
}

// ---------------------------------------------------------------------------
// Config plugin: register package in MainApplication.kt
// ---------------------------------------------------------------------------

function withScreenPinningMainApplication(config) {
    return withMainApplication(config, (config) => {
        const src = config.modResults.contents;
        const importLine = 'import com.securestop.app.ScreenPinningPackage';
        const packageLine = '            packages.add(ScreenPinningPackage())';
        let updated = src;
        if (!updated.includes(importLine)) {
            updated = updated.replace(
                /^(package com\.securestop\.app)/m,
                `$1\n\n${importLine}`
            );
        }
        if (!updated.includes(packageLine)) {
            updated = updated.replace(
                /(override fun getPackages\(\)[\s\S]*?val packages = PackageList\(this\)\.packages)/,
                `$1\n${packageLine}`
            );
        }
        config.modResults.contents = updated;
        return config;
    });
}

// ---------------------------------------------------------------------------
// Config plugin: patch AndroidManifest.xml
//   1. Add android:lockTaskMode="if_whitelisted" to MainActivity
//      - Declares the activity as a lock task participant
//      - Required for startLockTask() to work correctly
//   2. Add android.permission.REORDER_TASKS
//      - Some Samsung/LG ROMs gatekeep startLockTask() behind this permission
// ---------------------------------------------------------------------------

function withScreenPinningManifest(config) {
    return withAndroidManifest(config, (config) => {
        const manifest = config.modResults;
        const app = manifest.manifest.application[0];

        // --- 1. Add lockTaskMode to MainActivity ---
        const activities = app.activity || [];
        const mainActivity = activities.find(
            (a) =>
                a.$['android:name'] === '.MainActivity' ||
                a.$['android:name'] === 'com.securestop.app.MainActivity'
        );
        if (mainActivity) {
            if (!mainActivity.$['android:lockTaskMode']) {
                mainActivity.$['android:lockTaskMode'] = 'if_whitelisted';
            }
        }

        // --- 2. Add REORDER_TASKS permission ---
        const usesPermissions = manifest.manifest['uses-permission'] || [];
        const REORDER = 'android.permission.REORDER_TASKS';
        const alreadyHasReorder = usesPermissions.some(
            (p) => p.$['android:name'] === REORDER
        );
        if (!alreadyHasReorder) {
            usesPermissions.push({ $: { 'android:name': REORDER } });
            manifest.manifest['uses-permission'] = usesPermissions;
        }

        return config;
    });
}

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

module.exports = function withScreenPinning(config) {
    config = withScreenPinningFiles(config);
    config = withScreenPinningMainApplication(config);
    config = withScreenPinningManifest(config);
    return config;
};
