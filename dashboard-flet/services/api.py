"""Cliente HTTP para la API del bot ContadorPPL."""

import httpx
from config import API_BASE_URL, API_TOKEN


class ContadorAPI:
    """Cliente de la API REST del bot."""

    def __init__(self, base_url: str = API_BASE_URL, token: str = API_TOKEN):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self._client = httpx.Client(timeout=15.0)

    def _headers(self) -> dict:
        return {
            "X-API-Token": self.token,
            "Content-Type": "application/json",
        }

    # ── Autenticación ──────────────────────────────────────────

    def login(self, phone: str) -> dict:
        """Verifica si un teléfono está autorizado."""
        try:
            r = self._client.get(f"{self.base_url}/auth/{phone}")
            if r.status_code == 200:
                return r.json()
            return {"autorizado": False, "error": r.json().get("error", "No autorizado")}
        except Exception as e:
            return {"autorizado": False, "error": str(e)}

    # ── Estado del bot ─────────────────────────────────────────

    def status(self) -> dict:
        try:
            r = self._client.get(f"{self.base_url}/status", headers=self._headers())
            return r.json()
        except Exception as e:
            return {"online": False, "error": str(e)}

    # ── Grupos ─────────────────────────────────────────────────

    def listar_grupos(self, admin_phone: str) -> list:
        try:
            r = self._client.get(
                f"{self.base_url}/groups",
                params={"adminPhone": admin_phone},
                headers=self._headers(),
            )
            return r.json() if r.status_code == 200 else []
        except Exception:
            return []

    def obtener_config_grupo(self, group_id: str) -> dict:
        try:
            r = self._client.get(
                f"{self.base_url}/groups/{group_id}/config",
                headers=self._headers(),
            )
            return r.json() if r.status_code == 200 else {}
        except Exception:
            return {}

    def actualizar_config_grupo(self, group_id: str, config: dict) -> dict:
        try:
            r = self._client.put(
                f"{self.base_url}/groups/{group_id}/config",
                json=config,
                headers=self._headers(),
            )
            return r.json()
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Listeros ───────────────────────────────────────────────

    def listar_listeros(self, group_id: str) -> list:
        try:
            r = self._client.get(
                f"{self.base_url}/groups/{group_id}/listeros",
                headers=self._headers(),
            )
            return r.json() if r.status_code == 200 else []
        except Exception:
            return []

    def agregar_listero(self, group_id: str, phone: str, nombre: str,
                        porciento: int = 0, horario: str = "ambos") -> dict:
        try:
            r = self._client.post(
                f"{self.base_url}/groups/{group_id}/listeros",
                json={
                    "phone": phone,
                    "nombre": nombre,
                    "porciento": porciento,
                    "horarioPermitido": horario,
                },
                headers=self._headers(),
            )
            return r.json()
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def actualizar_listero(self, group_id: str, phone: str, data: dict) -> dict:
        try:
            r = self._client.put(
                f"{self.base_url}/groups/{group_id}/listeros/{phone}",
                json=data,
                headers=self._headers(),
            )
            return r.json()
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def eliminar_listero(self, group_id: str, phone: str) -> dict:
        try:
            r = self._client.delete(
                f"{self.base_url}/groups/{group_id}/listeros/{phone}",
                headers=self._headers(),
            )
            return r.json()
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Jornadas ───────────────────────────────────────────────

    def listar_jornadas(self, group_id: str) -> list:
        try:
            r = self._client.get(
                f"{self.base_url}/groups/{group_id}/jornadas",
                headers=self._headers(),
            )
            return r.json() if r.status_code == 200 else []
        except Exception:
            return []

    # ── Estadísticas ───────────────────────────────────────────

    def estadisticas(self, admin_phone: str) -> dict:
        try:
            r = self._client.get(
                f"{self.base_url}/stats/{admin_phone}",
                headers=self._headers(),
            )
            return r.json() if r.status_code == 200 else {}
        except Exception:
            return {}


# Instancia global
api = ContadorAPI()
