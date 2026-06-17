# Flutter: Provider Loading State Causes Widget Disposal Anti-Pattern

## The Pattern

When using `Consumer<Provider>` at the top level of `MaterialApp` to switch screens based on a global `status` field (e.g., `loading` → `SplashScreen`, `authenticated` → `Dashboard`, `unauthenticated` → `LoginScreen`), **never change that same status from within a leaf widget that will be disposed as a result.**

## Root Cause

1. Leaf widget (e.g., `LoginScreen`) calls `provider.doSomething()`
2. Provider changes `status = loading` and calls `notifyListeners()`
3. Consumer rebuilds the widget tree — the leaf widget is **disposed**
4. The async function that called the provider is still running on the **disposed** widget
5. When it tries `setState()`, `mounted` is `false` — **silently fails**

## Fix

Keep loading state **local to the widget** when the operation is widget-scoped:

```dart
// BAD: Provider sets global loading state
void requestCode() {
  status = AuthStatus.loading;
  notifyListeners();
  // ... async work
}

// GOOD: Widget manages its own loading state
void requestCode() async {
  // ... async work (no status change)
}

// In the widget:
bool _isLoading = false;

void _solicitarCodigo() async {
  setState(() => _isLoading = true);
  await authProvider.requestCode();
  if (mounted) setState(() => _codeSent = true);
  // ...
}
```

## Rule

> Provider state that controls **which screen is shown** must not be changed by an operation initiated from within one of those screens, unless the operation is truly global (e.g., logout). Widget-local loading/transitions belong in local widget state.

## Example Scenario

- `main.dart` uses `Consumer<AuthProvider>` → switches on `authProvider.status`
- `LoginScreen` button calls `authProvider.requestCode()` which sets `status = loading`
- Result: `LoginScreen` is disposed, `SplashScreen` appears, code input never shows

## File Locations

This was found in:
- `lib/main.dart` — Consumer widget tree switching
- `lib/providers/auth_provider.dart` — requestCode setting global status
- `lib/screens/login_screen.dart` — _solicitarCodigo with setState on disposed widget
