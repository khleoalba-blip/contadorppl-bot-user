# ContadorPPL Dashboard — App Flet para Android

Dashboard móvil para administrar tu bot **ContadorPPL** desde el teléfono.

## 📱 Características

- **Login** por número de teléfono (validado contra `users_access.json`)
- **Dashboard** con estadísticas en tiempo real
- **Gestión de grupos**: ver configuración, lotería, premios, horarios
- **Gestión de listeros**: agregar, activar/desactivar, eliminar
- **Jornadas**: historial de sesiones activas y cerradas
- **Reportes**: resumen general y estado del sistema

## 🏗️ Estructura

```
dashboard-flet/
├── main.py              # App principal con navegación
├── config.py            # URL de la API, colores, token
├── requirements.txt     # flet, httpx
├── services/
│   └── api.py           # Cliente HTTP para la API del bot
├── pages/
│   ├── login.py         # Pantalla de login
│   ├── home.py          # Dashboard principal
│   ├── grupos.py        # Lista de grupos
│   ├── grupo_detalle.py # Detalle de grupo (config, premios, horarios)
│   ├── listeros.py      # CRUD de listeros
│   ├── jornadas.py      # Historial de jornadas
│   └── reportes.py      # Estadísticas generales
└── assets/
```

## 🚀 Instalación

### 1. Agregar la API al bot

Copia `plugins/api_server.js` en la carpeta `plugins/` de tu bot.

Luego, en `index.js` del bot, agrega estas líneas **después** de `const app = express();`:

```js
// API para Dashboard Flet
app.use(express.json());
app.use('/api', require('./plugins/api_server.js'));
```

Y si quieres cambiar el token (opcional), agrega en tu `config.env`:

```
API_TOKEN=tu-token-seguro-aqui
```

### 2. Instalar dependencias Python

```bash
pip install flet httpx
```

### 3. Configurar la app

Edita `config.py`:

```python
API_BASE_URL = "http://IP_DE_TU_SERVIDOR:3000/api"
API_TOKEN = "cppl-dashboard-2024"  # Debe coincidir con el del bot
```

### 4. Probar en escritorio

```bash
cd dashboard-flet
flet run main.py
```

### 5. Compilar APK para Android

```bash
# Requiere: Flutter SDK + Android SDK instalados
flet build apk
```

El APK se generará en `build/apk/`.

---

## 🔐 Autenticación

La app valida el número de teléfono contra el archivo `users_access.json` del bot.

Para autorizar un nuevo usuario:

```json
// users_access.json
[
  { "phone": "5356965304", "name": "Yosbel", "expires": "7d" }
]
```

---

## 🔌 Endpoints de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/auth/:phone` | Verificar acceso |
| GET | `/api/status` | Estado del bot |
| GET | `/api/groups?adminPhone=X` | Listar grupos |
| GET | `/api/groups/:id/config` | Config del grupo |
| PUT | `/api/groups/:id/config` | Actualizar config |
| GET | `/api/groups/:id/listeros` | Listar listeros |
| POST | `/api/groups/:id/listeros` | Agregar listero |
| PUT | `/api/groups/:id/listeros/:phone` | Actualizar listero |
| DELETE | `/api/groups/:id/listeros/:phone` | Eliminar listero |
| GET | `/api/groups/:id/jornadas` | Historial de jornadas |
| GET | `/api/stats/:adminPhone` | Estadísticas |
