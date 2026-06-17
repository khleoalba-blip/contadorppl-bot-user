# 📱 ContadorPPL Dashboard — Guía de Instalación

## Arquitectura

```
┌─────────────────────┐         ┌──────────────────────┐
│   App Flutter       │  HTTP   │  Bot ContadorPPL     │
│   (Android)         │ ◄─────► │  (Baileys/WhatsApp)  │
│                     │  API    │  + Express Server     │
│   - Login con       │  REST   │                      │
│     código SMS      │         │  - api_dashboard.cjs │
│   - Dashboard        │         │  - MongoDB/SQLite    │
│     grupos          │         │  - Scheduler         │
│   - Gestión          │         │  - OCR/Jugadas       │
│     listeros        │         │                      │
│   - Configuración   │         │                      │
│   - Jornadas        │         │                      │
└─────────────────────┘         └──────────────────────┘
```

## 1. API Dashboard (lado del bot)

El archivo `lib/api_dashboard.cjs` ya está integrado en el `index.js` del bot.
Se registra automáticamente al conectarse a WhatsApp.

### Endpoints disponibles:

#### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/request-code` | Solicita código de verificación (se envía por WhatsApp) |
| POST | `/api/auth/verify-code` | Verifica código y devuelve token JWT |
| POST | `/api/auth/refresh-token` | Renueva token |

#### Usuario
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/user/profile` | Perfil del usuario autenticado |

#### Grupos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/groups` | Lista grupos del admin |
| GET | `/api/groups/:id` | Detalle de grupo + configuración |
| PUT | `/api/groups/:id/config` | Actualizar configuración |
| GET | `/api/groups/:id/horarios` | Obtener horarios |
| PUT | `/api/groups/:id/horarios` | Actualizar horarios |
| GET | `/api/groups/:id/stats` | Estadísticas del grupo |

#### Listeros
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/groups/:id/listeros` | Lista listeros del grupo |
| POST | `/api/groups/:id/listeros` | Agregar listero |
| PUT | `/api/groups/:id/listeros/:phone` | Editar listero |
| DELETE | `/api/groups/:id/listeros/:phone` | Eliminar listero |

#### Jornadas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/groups/:id/jornadas` | Lista jornadas |
| GET | `/api/groups/:id/jornadas/:jid` | Detalle de jornada |

## 2. App Flutter (Android)

### Requisitos
- Flutter SDK 3.22+
- Android Studio / VS Code
- Dispositivo Android o emulador

### Instalación

```bash
cd flutter_dashboard
flutter pub get
flutter run
```

### Compilar APK

```bash
flutter build apk --release
# El APK estará en: build/app/outputs/flutter-apk/app-release.apk
```

## 3. Configuración

### En la app Flutter
Al abrir la app por primera vez, configura la IP/Puerto de tu bot:
- Si el bot corre en la misma red WiFi: `http://192.168.x.x:3000`
- Si usas ngrok/túnel: `https://tu-tunel.ngrok.io`
- Si está en servidor: `https://tu-dominio.com`

### En el bot
Asegúrate de que:
1. El archivo `users_access.json` tenga los teléfonos autorizados
2. El puerto 3000 (o el configurado en PORT) esté accesible
3. El bot esté conectado a WhatsApp

### users_access.json (ejemplo)
```json
[
  { "phone": "5356965304", "name": "Yosbel", "expires": "7d" },
  { "phone": "5351731899", "name": "LBMA", "expires": "permanent" }
]
```

## 4. Flujo de Login

1. Usuario abre la app → ingresa su número de teléfono
2. App envía `POST /api/auth/request-code` con el teléfono
3. El bot envía un código de 6 dígitos por WhatsApp al usuario
4. Usuario ingresa el código en la app
5. App envía `POST /api/auth/verify-code` con teléfono + código
6. Si es correcto → recibe token JWT (válido por 30 días)
7. App guarda el token y muestra el dashboard

## 5. Seguridad

- El código de verificación expira en 5 minutos
- Máximo 3 intentos de verificación por código
- Token JWT válido por 30 días
- Solo usuarios en `users_access.json` pueden autenticarse
- Cada admin solo ve sus propios grupos
- Las rutas de la API requieren token Bearer

## 6. Solución de Problemas

| Problema | Solución |
|----------|----------|
| "No se pudo conectar al servidor" | Verifica IP/puerto y que el bot esté corriendo |
| "Tu número no está autorizado" | Agrega el teléfono en `users_access.json` |
| "No llega el código por WhatsApp" | Verifica que el bot tenga tu contacto guardado |
| "Código incorrecto" | Solicita uno nuevo, verifica que sea el más reciente |
| "No aparecen mis grupos" | El adminPhone en la config del grupo debe coincidir con tu teléfono |
