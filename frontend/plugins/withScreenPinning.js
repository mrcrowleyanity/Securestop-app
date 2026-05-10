// frontend/plugins/withScreenPinning.js
// Expo config plugin: injects ScreenPinningModule native code during prebuild
// Updated for RN 0.81 New Architecture (TurboReactPackage)

const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');
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
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = ScreenPinningModule.NAME)
class ScreenPinningModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "ScreenPinning"
    }

    override fun getName(): String = NAME

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
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                activity.startLockTask()
                promise.resolve(true)
            } else {
                promise.reject("UNSUPPORTED", "Screen pinning requires Android 5.0+")
            }
        } catch (e: Exception) {
            promise.reject("START_LOCK_TASK_ERROR", e.message ?: "Unknown error")
        }
    }

    @ReactMethod
    fun stopLockTask(promise: Promise) {
        val activity = requireActivity(promise) ?: return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                activity.stopLockTask()
                promise.resolve(true)
            } else {
                promise.reject("UNSUPPORTED", "Screen pinning requires Android 5.0+")
            }
        } catch (e: Exception) {
            promise.reject("STOP_LOCK_TASK_ERROR", e.message ?: "Unknown error")
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

            fs.writeFileSync(
                path.join(javaDir, 'ScreenPinningModule.kt'),
                SCREEN_PINNING_MODULE_KT
            );
            fs.writeFileSync(
                path.join(javaDir, 'ScreenPinningPackage.kt'),
                SCREEN_PINNING_PACKAGE_KT
            );

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

        // Add import if not already present
        if (!updated.includes(importLine)) {
            updated = updated.replace(
                /^(package com\.securestop\.app)/m,
                `$1\n\n${importLine}`
            );
        }

        // Add package registration if not already present
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
// Compose
// ---------------------------------------------------------------------------

module.exports = function withScreenPinning(config) {
    config = withScreenPinningFiles(config);
    config = withScreenPinningMainApplication(config);
    return config;
};
