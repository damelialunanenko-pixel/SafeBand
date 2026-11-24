# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Google Maps API key (Android builds)

The map screen (`src/app/map.tsx`) uses `react-native-maps`.

- **Expo Go** works without a key (Android uses Expo Go's built-in Google Maps key; iOS uses Apple Maps).
- **Your own Android build** (`npx expo run:android`, EAS Build) needs your own key, otherwise the map is blank/grey.

How to get a key:

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. **APIs & Services → Library** → enable **Maps SDK for Android**.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Restrict the key: *Application restrictions* → **Android apps**, add the package name and the SHA-1
   of your signing certificate (debug: `cd android && ./gradlew signingReport`; EAS: `eas credentials`).
   *API restrictions* → **Maps SDK for Android**.

How to provide it (the key is never committed — `app.config.ts` reads it from the environment):

```bash
# local builds: create .env.local (already git-ignored)
echo GOOGLE_MAPS_API_KEY=AIza... > .env.local

# EAS Build: store it as an EAS environment variable
eas env:create --name GOOGLE_MAPS_API_KEY --value AIza... --visibility secret
```

After changing the key, rebuild the native app (`npx expo run:android`); a JS reload is not enough.

## Expo Go vs development build

- **Expo Go** — everything except SMS: `npx expo start`, scan the QR code with Expo Go (SDK 58).
- **SMS reading from the bracelet** — only in your own Android build, because it needs a custom native
  module that Expo Go does not contain: `npm run android:dev` (= `npx expo run:android`) or an EAS build.

## Bracelet SMS (Android only)

The bracelet can send its location as a plain SMS (format in [DEVICE_SPEC.md](DEVICE_SPEC.md) §11).
The local native module `modules/safeband-sms` (Kotlin, autolinked from `./modules`) receives `SMS_RECEIVED`
and reads the inbox; `src/services/bracelet-sms.ts` keeps only messages from `wards/{id}.braceletPhone`
and writes them to `devices/{braceletId}`.

- Works **only** in a build with native code: `npx expo run:android` (or `npm run android:dev`) or an EAS build.
  In Expo Go and on iOS the module is absent (`requireOptionalNativeModule` returns `null`); the app keeps
  working and Settings explains why SMS is unavailable.
- Enable: Settings → "Bracelet SMS" → enter the bracelet SIM number → "Allow reading SMS".
- Test on an emulator: Extended controls → Phone → send an SMS from the saved number with the text
  `latitude: 43.238\nlongitude: 76.900\nsource: cell\naccuracy_m: 150`.
- `RECEIVE_SMS` / `READ_SMS` are in `app.json`; Google Play allows them only with an approved permissions declaration.

## Показать приложение без компьютера (Expo Go)

JS-код публикуется на серверы Expo (EAS Update), и телефон открывает его в Expo Go из любой сети —
ноутбук и `npx expo start` не нужны. Expo Go должен быть последней версии с поддержкой **SDK 58**
(версия SDK проекта и Expo Go должны совпадать). В Expo Go работает всё, **кроме чтения SMS от браслета**
(это нативный модуль `modules/safeband-sms`, его нет в Expo Go — для SMS см. следующий раздел).

**Один раз:**

```bash
npm i -g eas-cli
eas login                 # бесплатный аккаунт на expo.dev
eas init                  # создаёт проект на expo.dev, пишет extra.eas.projectId в app.json
eas update:configure      # пишет updates.url в app.json
```

Закоммитьте изменения `app.json` после этих команд.

**Каждый раз, когда нужно показать новую версию:**

```bash
npm run update:preview          # = eas update --branch preview --environment preview --platform android
npm run update:preview:lowmem   # то же, но Node ограничен 2 ГБ — если не хватает памяти
```

Перед `lowmem` закройте браузер и эмулятор: сборка JS-бандла (Metro) — самая тяжёлая часть.
`--environment` обязателен для SDK 55+; сообщение update можно поменять: `npm run update:preview -- --message "что изменилось"`.

**Открыть на телефоне:**

1. expo.dev → проект **safeband** → **Updates** → откройте последний update (ветка `preview`).
2. Нажмите **Preview** — появится QR-код/ссылка.
3. На телефоне: установите/обновите **Expo Go**, при необходимости войдите в тот же аккаунт Expo
   (Expo Go → Profile), отсканируйте QR камерой.

Документация: [EAS Update — getting started](https://docs.expo.dev/eas-update/getting-started/),
[Preview updates](https://docs.expo.dev/eas-update/preview/),
[expo-updates](https://docs.expo.dev/versions/latest/sdk/updates/) («only updates using Expo Go-compatible
libraries are supported»). Если Expo Go не открывает update (например, после обновления Expo Go на новый SDK),
используйте APK из следующего раздела — он не зависит от версии Expo Go.

## Установить приложение на телефон (APK)

Нужен для чтения SMS от браслета и как надёжный вариант, если Expo Go не подходит.

1. **Один раз собрать APK** (сборка идёт в облаке Expo, ноутбук не нагружается):

   ```bash
   npm run build:apk     # = eas build --platform android --profile preview
   ```

   В конце EAS покажет ссылку и QR на APK. Откройте её на Android-телефоне, скачайте и установите
   (разрешите установку из неизвестных источников для браузера). Бесплатный аккаунт ставит сборку в очередь —
   это может занять от нескольких минут до часа.

2. **Дальше изменения в JS доставляются без пересборки:** `npm run update:preview`. APK собран с каналом
   `preview` и при запуске сам проверяет обновления; если update скачан, приложение покажет
   «Доступно обновление — перезапустить?» (кнопка «Перезапустить»). Если отказаться, update применится
   при следующем холодном запуске.

3. **Пересобирать APK нужно только** если изменилась нативная часть: новые пакеты с нативным кодом
   (`npx expo install …`), `modules/`, разрешения или плагины в `app.json`, версия Expo SDK — или поле
   `version` в `app.json` (от него зависит `runtimeVersion`, policy `appVersion`). Update с другим
   `runtimeVersion` старый APK просто не получит.

Ключ Google Maps для APK задаётся переменной EAS (см. раздел «Google Maps API key» выше), а не в репозитории:
`eas env:create --name GOOGLE_MAPS_API_KEY --value AIza... --environment preview --visibility secret`.
Ограничение ключа в Google Cloud — по пакету **`kz.safeband.app`** и SHA-1 из `eas credentials`.
