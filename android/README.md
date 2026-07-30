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

APK debug: `android/app/build/outputs/apk/debug/app-debug.apk` → копируется скриптом в `Planer.apk`.

### Release APK (подписанный)

Для установки на телефон лучше использовать **release-сборку** — она подписывается вашим ключом, а не debug-ключом Android Studio.

1. Создайте keystore (один раз):

   ```powershell
   cd android
   .\create-keystore.ps1
   ```

   Пароль по умолчанию: `planer-change-me` (или задайте `PLANER_KEYSTORE_PASSWORD`).

2. Соберите release:

   ```powershell
   .\build-release-apk.bat
   ```

   Результат: **`Planer-release.apk`** в корне репозитория.

Файлы `keystore/` и `keystore.properties` **не коммитятся** — храните их локально и делайте резервную копию keystore.

> Play Защита может всё равно предупреждать о «неизвестном разработчике», пока приложение не опубликовано в Google Play. Нажмите **«Подробнее» → «Всё равно установить»**.

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
