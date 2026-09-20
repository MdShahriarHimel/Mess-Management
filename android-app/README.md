# Android app

This is the standalone Android app built by `.github/workflows/build-apk.yml`.
The separate `android/` directory is an earlier Capacitor project and is not used
by this workflow.

## How website changes reach the app

The app loads **https://mymessmanagement.onrender.com** over HTTPS. It runs the
website's React interface and calls its existing APIs, which use PostgreSQL.
There is no copied database, embedded database password, or bundled web build.
The website continues to enforce login, permissions and mess isolation.

- Deploy website changes to that address; they appear on the next page load.
  A GitHub commit alone does not update the hosted website.
- A fresh launch and the app's reload button load the current website, including
  its design and settings. Reload asks for confirmation so edits can be saved.
- While open, the app follows the website's existing refresh behavior. On return
  from the background it also emits the existing `app-global-refresh` event for
  modules that support it, unless a form field is focused. This does not reload
  the page or poll for deployment changes.
- Other users' changes are visible when the relevant website module fetches
  again. This wrapper does not add database subscriptions or guarantee instant
  updates across all screens. Use the website's refresh control or app reload
  to fetch current data.
- Internet access and a healthy deployed backend are required. Failed page
  loads show a retry screen; there is no offline editing or queued writes.

The native shell provides Android back navigation, persistent WebView storage,
image/file selection, a loading indicator, and an open-in-browser button.
External links in the main page open in another app rather than replacing the
website. The existing Google sign-in popup is retained.
Browser sessions are separate from the app's session. Downloads open externally;
generated `blob:` exports need to be created again in the browser.

## Build and install a test APK

Requirements: **JDK 17**, Android SDK **platform 34** and **build-tools 34.0.0**.
The checked-in wrapper downloads **Gradle 8.7**. Node is only needed to build or
check the website, not this live-website Android container.

```sh
export ANDROID_HOME="$HOME/Android/Sdk" # your actual SDK directory
cd android-app
./gradlew testDebugUnitTest lintDebug assembleDebug
```

Install `app/build/outputs/apk/debug/app-debug.apk` on a phone:

```sh
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Alternatively, copy the APK to the phone and open it, allowing installation
from that source when Android asks. This is a **debug/test APK**, not a Play
Store release. If an existing installation was signed by another key, Android
will reject an update. Do not uninstall it until any unsaved work is saved;
uninstalling removes local login/storage.

GitHub Actions runs unit tests and Android lint and publishes the test APK as
the **Mess-Management-Test-APK** artifact. Download and unzip it from a successful
**Build Android APK** run. Debug signing keys can differ between CI machines;
use your permanent release key for distributable updates.

## Release signing

The build no longer generates a new release identity for each run. For a
distributable APK, provide your existing permanent keystore using:

```sh
export ANDROID_KEYSTORE_PATH="/absolute/path/to/your-existing-release.jks"
export ANDROID_KEY_ALIAS="your-key-alias"
# Set ANDROID_KEYSTORE_PASSWORD and ANDROID_KEY_PASSWORD securely.
./gradlew assembleRelease
```

All four variables must be set to sign a release. Without them, `assembleRelease`
produces an **unsigned** APK. Keep the keystore and passwords out of Git; keep a
secure backup and reuse the same key for all updates. A Play Store submission
also needs review against Google's current target-SDK and publication policies.

To change the deployment address, edit `website_url` in
`app/src/main/res/values/strings.xml` and rebuild. Use an HTTPS root URL.

## Existing authentication issue and validation gaps

This change preserves the existing website and native Google login behavior.
The current `/api/auth/google-native` endpoint accepts a claimed email without
verifying a Google ID token. This is an existing authentication vulnerability;
it must be corrected before wider distribution. The Android Google client also
does not currently request an ID token. Fixing that flow requires coordinated
server/client authentication changes and Google OAuth configuration.

An APK build does not verify sign-in or database synchronization. Before
distribution, test on a phone with a dedicated test mess/account:

1. Sign in using email/password and, after the above fix, Google sign-in.
2. Save a test meal/deposit on the phone and confirm it on the website.
3. Change data on the website; refresh or resume the phone's relevant screen.
4. Change website appearance, deploy, then reload the app.
5. Test file selection, keyboard, rotation, back, offline retry and reconnect.
6. Confirm accounts in another test mess cannot see the first mess's data.

No database schema, API endpoints, website environment variables, or web
deployment configuration are changed by the Android work.
