package com.securestop.screenpinning

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.content.Context
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ScreenPinningModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ScreenPinningModule"

    /**
     * Start Lock Task Mode (screen pinning)
     * This pins the app to the screen, preventing users from leaving
     */
    @SuppressLint("NewApi")
    @ReactMethod
    fun startLockTask(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.resolve(false)
                return
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                activity.runOnUiThread {
                    try {
                        activity.startLockTask()
                        promise.resolve(true)
                    } catch (e: Exception) {
                        promise.resolve(false)
                    }
                }
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Stop Lock Task Mode (unpin the screen)
     */
    @SuppressLint("NewApi")
    @ReactMethod
    fun stopLockTask(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.resolve(false)
                return
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                activity.runOnUiThread {
                    try {
                        activity.stopLockTask()
                        promise.resolve(true)
                    } catch (e: Exception) {
                        promise.resolve(false)
                    }
                }
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Check if the app is currently in Lock Task Mode
     */
    @ReactMethod
    fun isInLockTaskMode(promise: Promise) {
        try {
            val activityManager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager

            val isLocked = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                activityManager.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
            } else {
                @Suppress("DEPRECATION")
                activityManager.isInLockTaskMode
            }

            promise.resolve(isLocked)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
