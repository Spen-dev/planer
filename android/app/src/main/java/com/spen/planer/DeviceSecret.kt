package com.spen.planer

import android.content.Context
import java.io.File
import java.util.UUID

object DeviceSecret {
    private const val FILE_NAME = "device.secret"

    fun getOrCreate(context: Context): String {
        val file = File(context.filesDir, FILE_NAME)
        if (file.isFile) {
            return file.readText(Charsets.UTF_8).trim()
        }
        val secret = UUID.randomUUID().toString().replace("-", "") +
            UUID.randomUUID().toString().replace("-", "")
        file.writeText(secret, Charsets.UTF_8)
        return secret
    }
}
