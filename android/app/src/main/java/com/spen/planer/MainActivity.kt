package com.spen.planer

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var bridge: PlanerBridge

    private var pendingCallbackToken: String? = null
    private var pendingSavePayload: String? = null
    private var pendingSaveMime: String? = null
    private var pendingSaveName: String? = null

    private val createDocumentLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("*/*"),
    ) { uri ->
        val token = pendingCallbackToken
        val payload = pendingSavePayload
        pendingCallbackToken = null
        pendingSavePayload = null
        pendingSaveMime = null
        pendingSaveName = null
        if (token == null) return@registerForActivityResult
        if (uri == null || payload == null) {
            bridge.resolveJsCallback(token, JSONObject().put("ok", false).put("cancelled", true).toString())
            return@registerForActivityResult
        }
        try {
            contentResolver.openOutputStream(uri)?.use { stream ->
                stream.write(payload.toByteArray(Charsets.UTF_8))
            }
            bridge.resolveJsCallback(token, JSONObject().put("ok", true).toString())
        } catch (e: Exception) {
            bridge.resolveJsCallback(
                token,
                JSONObject().put("ok", false).put("error", e.message ?: "save failed").toString(),
            )
        }
    }

    private val openDocumentLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri ->
        val token = pendingCallbackToken
        pendingCallbackToken = null
        if (token == null) return@registerForActivityResult
        if (uri == null) {
            bridge.resolveJsCallback(token, JSONObject().put("ok", false).put("cancelled", true).toString())
            return@registerForActivityResult
        }
        try {
            val content = contentResolver.openInputStream(uri)?.use { stream ->
                stream.bufferedReader(Charsets.UTF_8).readText()
            } ?: ""
            bridge.resolveJsCallback(
                token,
                JSONObject().put("ok", true).put("content", content).toString(),
            )
        } catch (e: Exception) {
            bridge.resolveJsCallback(
                token,
                JSONObject().put("ok", false).put("error", e.message ?: "load failed").toString(),
            )
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        bridge = PlanerBridge(this) { webView }
        webView.addJavascriptInterface(bridge, "PlanerNative")

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.textZoom = 100

        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    startActivity(Intent(Intent.ACTION_VIEW, request.url))
                    return true
                }
                return false
            }
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl("file:///android_asset/index.html?android=1")
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
            return
        }
        super.onBackPressed()
    }

    fun beginSaveBackup(token: String, payload: String, filename: String, mime: String) {
        pendingCallbackToken = token
        pendingSavePayload = payload
        pendingSaveMime = mime
        pendingSaveName = filename
        createDocumentLauncher.launch(filename)
    }

    fun beginSaveText(token: String, content: String, filename: String, mime: String) {
        pendingCallbackToken = token
        pendingSavePayload = content
        pendingSaveMime = mime
        pendingSaveName = filename
        createDocumentLauncher.launch(filename)
    }

    fun beginLoadBackup(token: String, mimeTypes: Array<String>) {
        pendingCallbackToken = token
        openDocumentLauncher.launch(mimeTypes)
    }

    fun runAutoBackup(token: String, payload: String) {
        try {
            val dir = bridge.autoBackupDir()
            val stamp = SimpleDateFormat("yyyy-MM-dd_HH-mm-ss", Locale.US).format(Date())
            val file = File(dir, "planer-auto-$stamp.planer")
            file.writeText(payload, Charsets.UTF_8)
            dir.listFiles()?.sortedByDescending { it.lastModified() }?.drop(10)?.forEach { it.delete() }
            bridge.resolveJsCallback(token, JSONObject().put("ok", true).put("path", file.absolutePath).toString())
        } catch (e: Exception) {
            bridge.resolveJsCallback(
                token,
                JSONObject().put("ok", false).put("error", e.message ?: "auto backup failed").toString(),
            )
        }
    }
}
