plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
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

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
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
