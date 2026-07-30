plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

import java.util.Properties

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("keystore.properties")
val hasReleaseKeystore = keystorePropertiesFile.isFile
if (hasReleaseKeystore) {
    val raw = keystorePropertiesFile.readText(Charsets.UTF_8).removePrefix("\uFEFF")
    keystoreProperties.load(raw.byteInputStream())
}

android {
    namespace = "com.spen.planer"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.spen.planer"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.1.0"
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                val storePath = keystoreProperties.getProperty("storeFile")?.trim().orEmpty()
                require(storePath.isNotEmpty()) { "storeFile is missing in keystore.properties" }
                storeFile = rootProject.file(storePath)
                storePassword = keystoreProperties.getProperty("storePassword")?.trim()
                keyAlias = keystoreProperties.getProperty("keyAlias")?.trim()
                keyPassword = keystoreProperties.getProperty("keyPassword")?.trim()
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            if (hasReleaseKeystore) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.1")
    implementation("androidx.webkit:webkit:1.11.0")
}

val syncWebAssets by tasks.registering(Copy::class) {
    val srcDir = rootProject.projectDir.parentFile.resolve("src")
    from(srcDir.resolve("index.html"))
    from(srcDir.resolve("styles.css"))
    from(srcDir.resolve("mobile.css"))
    from(srcDir.resolve("js")) {
        into("js")
    }
    from(rootProject.projectDir.parentFile.resolve("LICENSE")) {
        rename { "eula.txt" }
    }
    into(layout.projectDirectory.dir("src/main/assets"))
}

tasks.named("preBuild") {
    dependsOn(syncWebAssets)
}
