package com.spen.planer

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject
import java.io.File

class PlanerBridge(
    private val activity: MainActivity,
    private val webViewProvider: () -> WebView?,
) {
    @JavascriptInterface
    fun checkLicense(): String {
        val ok = LicenseManager.isLicensed(activity)
        return JSONObject().put("ok", ok).toString()
    }

    @JavascriptInterface
    fun activateLicense(key: String): String {
        val (ok, error) = LicenseManager.activateLicense(activity, key)
        return if (ok) {
            JSONObject().put("ok", true).toString()
        } else {
            JSONObject().put("ok", false).put("error", error).toString()
        }
    }

    @JavascriptInterface
    fun getDeviceSecret(): String {
        return try {
            JSONObject()
                .put("ok", true)
                .put("secret", DeviceSecret.getOrCreate(activity))
                .toString()
        } catch (e: Exception) {
            JSONObject().put("ok", false).put("error", e.message ?: "error").toString()
        }
    }

    @JavascriptInterface
    fun getAppInfo(): String {
        val dataDir = activity.filesDir.absolutePath
        return JSONObject()
            .put("version", BuildConfig.VERSION_NAME)
            .put("dataDir", dataDir)
            .put("autostart", false)
            .toString()
    }

    @JavascriptInterface
    fun requestSaveBackup(token: String, payload: String) {
        activity.runOnUiThread {
            activity.beginSaveBackup(token, payload, "planer-backup.planer", "application/octet-stream")
        }
    }

    @JavascriptInterface
    fun requestLoadBackup(token: String) {
        activity.runOnUiThread {
            activity.beginLoadBackup(token, arrayOf("application/octet-stream", "application/json", "text/plain", "*/*"))
        }
    }

    @JavascriptInterface
    fun requestAutoBackup(token: String, payload: String) {
        activity.runOnUiThread {
            activity.runAutoBackup(token, payload)
        }
    }

    @JavascriptInterface
    fun requestSaveTextFile(token: String, content: String, filename: String) {
        activity.runOnUiThread {
            activity.beginSaveText(token, content, filename, "text/csv")
        }
    }

    @JavascriptInterface
    fun getDonationInfo(): String {
        return try {
            val raw = activity.assets.open("donation.json").bufferedReader().use { it.readText() }
            JSONObject(raw).put("ok", true).toString()
        } catch (_: Exception) {
            JSONObject()
                .put("ok", true)
                .put("enabled", false)
                .put("hint", "Настройте donation.json в assets для донатов.")
                .toString()
        }
    }

    @JavascriptInterface
    fun openDonationPayment(amount: Double, method: String): String {
        return try {
            val info = JSONObject(getDonationInfo())
            val wallet = info.optString("yoomoney_wallet", "")
            if (wallet.isBlank()) {
                return JSONObject().put("ok", false).put("error", "Кошелёк не настроен.").toString()
            }
            val sum = amount.coerceAtLeast(1.0)
            val url = "https://yoomoney.ru/quickpay/confirm.xml" +
                "?receiver=$wallet" +
                "&quickpay-form=donate" +
                "&sum=$sum" +
                "&label=planer-android"
            activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
            JSONObject().put("ok", true).toString()
        } catch (e: Exception) {
            JSONObject().put("ok", false).put("error", e.message ?: "error").toString()
        }
    }

    @JavascriptInterface
    fun copyDonationDetails(amount: Double): String {
        return try {
            val info = JSONObject(getDonationInfo())
            val phone = info.optString("sbp_phone", "")
            val name = info.optString("sbp_name", "")
            val text = buildString {
                append("Планер — поддержка проекта\n")
                append("Сумма: ").append(amount.toInt()).append(" ₽\n")
                if (phone.isNotBlank()) append("СБП: ").append(phone).append('\n')
                if (name.isNotBlank()) append("Получатель: ").append(name)
            }
            val clipboard = activity.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("donation", text))
            JSONObject().put("ok", true).toString()
        } catch (e: Exception) {
            JSONObject().put("ok", false).put("error", e.message ?: "error").toString()
        }
    }

    @JavascriptInterface
    fun openEula(): String {
        return try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(Uri.parse("file:///android_asset/eula.txt"), "text/plain")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.startActivity(Intent.createChooser(intent, "EULA"))
            JSONObject().put("ok", true).toString()
        } catch (_: Exception) {
            JSONObject()
                .put("ok", false)
                .put("error", "Файл EULA не найден в assets.")
                .toString()
        }
    }

    fun resolveJsCallback(token: String, json: String) {
        activity.runOnUiThread {
            webViewProvider()?.evaluateJavascript(
                "window.__planerResolveCallback?.(${JSONObject.quote(token)}, ${JSONObject.quote(json)});",
                null,
            )
        }
    }

    fun autoBackupDir(): File {
        val dir = File(activity.filesDir, "backups")
        if (!dir.exists()) dir.mkdirs()
        return dir
    }
}
