# Планer для Android

Мобильная версия **Планера** — WebView-оболочка вокруг того же HTML/CSS/JS интерфейса, что и desktop-приложение.

## Возможности

- Недельный планер, матрица Эйзенхауэра, статистика
- Шифрование данных паролем (AES-GCM + PBKDF2)
- Лицензионный ключ (тот же формат `PLAN-XXXX-...`)
- Импорт / экспорт `.planer` через системный файловый диалог
- Автобэкап во внутреннее хранилище приложения
- «Запомнить пароль» через device secret на устройстве

## Требования

- Android Studio Ladybug (2024.2+) или новее
- Android SDK 34
- JDK 17

## Сборка

1. Синхронизируйте веб-ресурсы из `src/`:

   ```powershell
   cd android
   .\sync-web.ps1
   ```

   или на Linux/macOS:

   ```bash
   cd android
   ./sync-web.sh
   ```

2. Откройте папку `android/` в Android Studio.

3. **Build → Build Bundle(s) / APK(s) → Build APK(s)**

   или из терминала (если установлен Gradle):

   ```bash
   cd android
   ./gradlew assembleDebug
   ```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Разработка

После изменений в `src/` (HTML, CSS, JS) снова запустите `sync-web.ps1` и пересоберите APK.

### Структура

```
android/
  app/src/main/
    assets/          ← копия src/ (index.html, styles.css, js/*)
    java/com/spen/planer/
      MainActivity.kt
      PlanerBridge.kt    ← JS-мост (pywebview.api)
      LicenseManager.kt
      DeviceSecret.kt
  sync-web.ps1
```

### JS-мост

Файл `src/js/android-shim.js` превращает `window.PlanerNative` (Kotlin) в `window.pywebview.api`, чтобы основной код приложения работал без дублирования.

На Android `isAndroidShell()` отключает desktop-only поведение (авто-ресайз окна, защита от DevTools).

## Лицензия

Используется тот же алгоритм, что в `src/license.py`. Демо-ключ:

```
PLAN-75A3-A66F-F19B-3463
```

## Донаты (опционально)

Положите `donation.json` в `app/src/main/assets/` по образцу desktop `%APPDATA%\Planer\donation.json`.
