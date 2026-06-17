# Proposal: TOOLS.md — Flutter Android v2 embedding fix patterns

**Signature:** `flutter-android-v2-embedding-fix`

**Target:** TOOLS.md

**Reason:** Flutter 3.24+ rejects v1 Android embedding entirely; these exact 5-file Gradle/Android patterns fix the CI build failure and apply to any manually-created Flutter project.

---

## Proposed addition to TOOLS.md

```markdown
### Flutter: Android v2 embedding fix

Flutter ≥3.24 rejects the deprecated v1 Android embedding. If a project was created
manually or predates the migration, the CI build fails with:
"Build failed due to use of deleted Android v1 embedding."

Apply these five changes to migrate:

1. **android/settings.gradle** — add the plugin-loader plugin:
   ```groovy
   plugins {
       id "dev.flutter.flutter-plugin-loader" version "1.0.0"
       id "com.android.application" version "8.1.0" apply false
       id "org.jetbrains.kotlin.android" version "1.9.10" apply false
   }
   ```

2. **android/build.gradle** — remove the entire `buildscript {}` block.
   Keep only:
   ```groovy
   allprojects {
       repositories {
           google()
           mavenCentral()
       }
   }
   rootProject.buildDir = "../build"
   ```

3. **android/app/build.gradle** — replace `apply plugin:` lines with a `plugins {}` block:
   ```groovy
   plugins {
       id "com.android.application"
       id "kotlin-android"
       id "dev.flutter.flutter-gradle-plugin"
   }
   ```

4. **android/app/src/main/res/values/styles.xml** — replace Material3-dependent theme
   with a vanilla Android theme:
   ```xml
   <resources>
       <style name="LaunchTheme" parent="@android:style/Theme.Light.NoTitleBar">
           <item name="android:windowBackground">@drawable/launch_background</item>
       </style>
       <style name="NormalTheme" parent="@android:style/Theme.Light.NoTitleBar">
           <item name="android:windowBackground">?android:colorBackground</item>
       </style>
   </resources>
   ```

5. **AndroidManifest.xml** — update `android:theme` references to match the new
   style names defined in step 4 (e.g. `@style/LaunchTheme`, `@style/NormalTheme`).

These patterns apply to any Flutter Android project that was scaffolded with v1
embedding — the Gradle structure and theme references are identical across projects.
```
