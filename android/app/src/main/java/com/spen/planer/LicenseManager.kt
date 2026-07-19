package com.spen.planer

import android.content.Context
import org.json.JSONObject
import java.io.File
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object LicenseManager {
    private const val LICENSE_SECRET = "planer-protect-v1-spen-dev-change-me"
    private val KEY_PATTERN = Regex("^PLAN-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$")

    private fun licenseFile(context: Context): File =
        File(context.filesDir, "license.dat")

    fun normalizeKey(key: String): String =
        key.trim().uppercase().replace(" ", "")

    fun validateLicenseKey(key: String): Boolean {
        val normalized = normalizeKey(key)
        if (!KEY_PATTERN.matches(normalized)) return false
        val body = normalized.replace("PLAN-", "").replace("-", "")
        if (body.length < 16) return false
        val expected = hmacSha256Hex(body.substring(0, 12), LICENSE_SECRET)
            .uppercase()
            .take(4)
        return body.substring(12, 16) == expected
    }

    fun licenseToken(key: String): String {
        val normalized = normalizeKey(key)
        val digest = java.security.MessageDigest.getInstance("SHA-256")
        digest.update(normalized.toByteArray(Charsets.UTF_8))
        digest.update(LICENSE_SECRET.toByteArray(Charsets.UTF_8))
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    fun isLicensed(context: Context): Boolean {
        val file = licenseFile(context)
        if (!file.isFile) return false
        return try {
            val data = JSONObject(file.readText(Charsets.UTF_8))
            val key = normalizeKey(data.optString("key", ""))
            val token = data.optString("token", "")
            key.isNotEmpty() && validateLicenseKey(key) && token == licenseToken(key)
        } catch (_: Exception) {
            false
        }
    }

    fun activateLicense(context: Context, key: String): Pair<Boolean, String> {
        if (!validateLicenseKey(key)) {
            return false to "Неверный лицензионный ключ."
        }
        val normalized = normalizeKey(key)
        val payload = JSONObject()
            .put("key", normalized)
            .put("token", licenseToken(normalized))
        licenseFile(context).writeText(payload.toString(), Charsets.UTF_8)
        return true to ""
    }

    private fun hmacSha256Hex(message: String, secret: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(message.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }
}
