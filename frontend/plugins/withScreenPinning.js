// frontend/plugins/withScreenPinning.js
// Expo config plugin: injects ScreenPinningModule native code during prebuild

const { withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Kotlin source files
// ---------------------------------------------------------------------------

const SCREEN_PINNING_MODULE_KT = `package com.securestop.app

import android.app.Activity
import android.app.ActivityManager
import android.content.Context
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ScreenPinningModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ScreenPinning"

    private fun requireActivity(promise: Promise): Activity? {
        val activity: Activity? = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity found")
        }
        return activity
    }

    @ReactMethod
    fun startLockTask(promise: Promise) {
        val activity = requireActivity(promise) ?: return
        activity.runOnUiThread {
            try {
                activity.startLockTask()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("START_FAILED", "startLockTask failed: ${'$'}{e.message}", e)
            }
        }
    }

    @ReactMethod
    fun stopLockTask(promise: Promise) {
        val activity = requireActivity(promise) ?: return
        activity.runOnUiThread {
            try {
                activity.stopLockTask()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("STOP_FAILED", "stopLockTask failed: ${'$'}{e.message}", e)
            }
        }
    }

    @ReactMethod
    fun isInLockTaskMode(promise: Promise) {
        try {
            val am = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val isLocked = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
            } else {
                @Suppress("DEPRECATION")
                am.isInLockTaskMode
            }
            promise.resolve(isLocked)
        } catch (e: Exception) {
            promise.reject("CHECK_FAILED", "isInLockTaskMode failed: ${'$'}{e.message}", e)
        }
    }
}
`;

const SCREEN_PINNING_PACKAGE_KT = `package com.securestop.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ScreenPinningPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(ScreenPinningModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;

// ---------------------------------------------------------------------------
// Mod 1: Write Kotlin source files into android/ during prebuild
// ---------------------------------------------------------------------------

function withScreenPinningKotlinFiles(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const sourceDir = path.join(
        projectRoot,
        'android', 'app', 'src', 'main', 'java',
        'com', 'securestop', 'app'
      );
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(
        path.join(sourceDir, 'ScreenPinningModule.kt'),
        SCREEN_PINNING_MODULE_KT,
        'utf8'
      );
      fs.writeFileSync(
        path.join(sourceDir, 'ScreenPinningPackage.kt'),
        SCREEN_PINNING_PACKAGE_KT,
        'utf8'
      );
      return cfg;
    },
  ]);
}

// ---------------------------------------------------------------------------
// Mod 2: Register the package in MainApplication.kt
// ---------------------------------------------------------------------------

const IMPORT_LINE = 'import com.securestop.app.ScreenPinningPackage';
const APPLY_ANCHOR = 'PackageList(application).packages.apply {';
const PACKAGE_LINE = '      add(ScreenPinningPackage())';

function withScreenPinningMainApplication(config) {
  return withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Add import if not present
    if (!contents.includes(IMPORT_LINE)) {
      const lastImportIdx = contents.lastIndexOf('\nimport ');
      if (lastImportIdx !== -1) {
        const endOfLine = contents.indexOf('\n', lastImportIdx + 1);
        contents =
          contents.slice(0, endOfLine + 1) +
          IMPORT_LINE + '\n' +
          contents.slice(endOfLine + 1);
      }
    }

    // Add package registration inside the apply block if not already present
    if (!contents.includes('ScreenPinningPackage()') && contents.includes(APPLY_ANCHOR)) {
      contents = contents.replace(
        APPLY_ANCHOR,
        APPLY_ANCHOR + '\n' + PACKAGE_LINE
      );
    } else if (!contents.includes('ScreenPinningPackage()')) {
      console.warn(
        '[withScreenPinning] Could not find anchor in MainApplication.kt: "' + APPLY_ANCHOR + '"'
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

// ---------------------------------------------------------------------------
// Combined plugin export
// ---------------------------------------------------------------------------

module.exports = function withScreenPinning(config) {
  config = withScreenPinningKotlinFiles(config);
  config = withScreenPinningMainApplication(config);
  return config;
};
