# ContadorPPL Dashboard — Flutter App

Dashboard móvil nativo en **Flutter** para administrar tu bot ContadorPPL desde Android.

## 📱 Características

- **Login** por número de teléfono (+53 XXXX XXXX)
- **Dashboard** con stats en tiempo real (grupos, jornadas, listeros, estado del bot)
- **Gestión de grupos**: configuración, premios, horarios
- **Gestión de listeros**: CRUD completo (agregar, activar/desactivar, eliminar)
- **Jornadas**: historial con filtro por estado
- **Reportes**: resumen general + info del sistema (MongoDB, API, versión)
- **Tema oscuro** profesional (púrpura + dorado, estilo casino)
- **Material Design 3** con navegación por tabs

## 🏗️ Estructura

```
contadorppl_app/
├── pubspec.yaml
├── analysis_options.yaml
├── lib/
│   ├── main.dart              # Entry point + tema
│   ├── config.dart            # URL API, colores, token
│   ├── models/
│   │   └── models.dart        # Usuario, Grupo, Listero, Jornada, Stats
│   ├── services/
│   │   └── api_service.dart   # Cliente HTTP
│   └── pages/
│       ├── login_page.dart         # Login + shell con bottom nav
│       ├── home_page.dart          # Dashboard principal
│       ├── grupos_page.dart        # Lista de grupos
│       ├── grupo_detalle_page.dart # Detalle de grupo
│       ├── listeros_page.dart      # CRUD de listeros
│       ├── jornadas_page.dart      # Historial
│       └── reportes_page.dart      # Estadísticas
```

## 🚀 Setup

### 1. Prerrequisitos

```bash
flutter --version   # Flutter 3.16+
dart --version      # Dart 3.2+
```

### 2. Agregar la API al bot

Copia `plugins/api_server.js` en tu bot y agrega en `index.js`:

```js
app.use(express.json());
app.use('/api', require('./plugins/api_server.js'));
```

### 3. Configurar la app

Edita `lib/config.dart` con la IP/puerto de tu bot:

```dart
static const String apiBaseUrl = 'http://192.168.1.X:3000/api';
static const String apiToken = 'cppl-dashboard-2024';
```

### 4. Ejecutar en modo debug

```bash
cd contadorppl_app
flutter pub get
flutter run
```

### 5. Compilar APK para Android

```bash
flutter build apk --release
# APK en: build/app/outputs/flutter-apk/app-release.apk
```

### 6. Compilar AppBundle para Play Store

```bash
flutter build appbundle --release
# AAB en: build/app/outputs/bundle/release/app-release.aab
```

---

## 🔌 API requerida

La app se conecta a la API REST que corre en el bot (puerto 3000):

| Endpoint | Uso |
|----------|-----|
| `GET /api/auth/:phone` | Login |
| `GET /api/status` | Estado del bot |
| `GET /api/groups?adminPhone=X` | Listar grupos |
| `GET/PUT /api/groups/:id/config` | Config del grupo |
| `GET/POST /api/groups/:id/listeros` | CRUD listeros |
| `PUT/DELETE /api/groups/:id/listeros/:phone` | Editar/eliminar listero |
| `GET /api/groups/:id/jornadas` | Jornadas |
| `GET /api/stats/:adminPhone` | Estadísticas |
