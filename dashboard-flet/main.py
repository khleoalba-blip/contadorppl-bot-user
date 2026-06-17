"""
ContadorPPL Dashboard — App mÃ³vil Flet
GestiÃ³n de grupos, listeros y jornadas de loterÃ­a.
"""

import flet as ft
from config import COLOR_BG, COLOR_PRIMARY, COLOR_ACCENT

# ── PÃ¡ginas ────────────────────────────────────────────────────
from pages.login import LoginPage
from pages.home import HomePage
from pages.grupos import GruposPage
from pages.grupo_detalle import GrupoDetallePage
from pages.listeros import ListerosPage
from pages.jornadas import JornadasPage
from pages.reportes import ReportesPage


class ContadorPPLApp:
    """App principal con navegaciÃ³n."""

    def __init__(self, page: ft.Page):
        self.page = page
        self._setup_window()
        self._setup_theme()
        self._build_ui()

    def _setup_window(self):
        self.page.title = "ContadorPPL"
        self.page.theme_mode = ft.ThemeMode.DARK
        self.page.padding = 0
        self.page.bgcolor = COLOR_BG
        self.page.window_width = 400
        self.page.window_height = 800
        self.page.window_resizable = False

    def _setup_theme(self):
        self.page.theme = ft.Theme(
            color_scheme=ft.ColorScheme(
                primary=COLOR_PRIMARY,
                secondary=COLOR_ACCENT,
                surface=COLOR_BG,
            ),
            font_family="Roboto",
        )

    def _build_ui(self):
        # NavegaciÃ³n
        self.page.navigation_bar = ft.NavigationBar(
            bgcolor="#1E1E3A",
            selected_index=0,
            on_change=self._on_nav_change,
            destinations=[
                ft.NavigationBarDestination(icon=ft.Icons.HOME_OUTLINED,
                    selected_icon=ft.Icons.HOME, label="Inicio"),
                ft.NavigationBarDestination(icon=ft.Icons.GROUPS_OUTLINED,
                    selected_icon=ft.Icons.GROUPS, label="Grupos"),
                ft.NavigationBarDestination(icon=ft.Icons.ASSESSMENT_OUTLINED,
                    selected_icon=ft.Icons.ASSESSMENT, label="Reportes"),
            ],
        )

        # Contenedor de pÃ¡ginas
        self.content_area = ft.Container(expand=True)
        self.page.add(self.content_area)

        # Sesión
        self.usuario = None  # Datos del usuario logueado
        self.admin_phone = None

        # Mostrar login primero
        self._mostrar_login()

        # Vincular navegación a visibilidad de navbar (solo si logueado)
        self.page.navigation_bar.visible = False

    def _on_nav_change(self, e):
        idx = e.control.selected_index
        if idx == 0:
            self._mostrar_home()
        elif idx == 1:
            self._mostrar_grupos()
        elif idx == 2:
            self._mostrar_reportes()

    # ── Navegación ─────────────────────────────────────────────

    def _mostrar_login(self):
        self.page.navigation_bar.visible = False
        login = LoginPage(self._on_login_success)
        self.content_area.content = login.build()
        self.page.update()

    def _on_login_success(self, usuario: dict, admin_phone: str):
        self.usuario = usuario
        self.admin_phone = admin_phone
        self.page.navigation_bar.visible = True
        self.page.navigation_bar.selected_index = 0
        self._mostrar_home()

    def _mostrar_home(self):
        if not self.admin_phone:
            return
        home = HomePage(self.admin_phone, self._navegar_a)
        self.content_area.content = home.build()
        self.page.update()
        home._cargar_datos()

    def _mostrar_grupos(self):
        if not self.admin_phone:
            return
        grupos = GruposPage(self.admin_phone, self._navegar_a)
        self.content_area.content = grupos.build()
        self.page.update()
        grupos._cargar()

    def _mostrar_grupo_detalle(self, group_id: str, nombre: str):
        detalle = GrupoDetallePage(
            group_id, nombre, self.admin_phone,
            self._volver_grupos, self._navegar_a
        )
        self.content_area.content = detalle.build()
        self.page.navigation_bar.visible = False
        self.page.update()
        detalle._construir_vista()

    def _mostrar_listeros(self, group_id: str, nombre_grupo: str):
        listeros = ListerosPage(group_id, nombre_grupo, self._volver_grupo_detalle)
        self.content_area.content = listeros.build()
        self.page.update()
        listeros._cargar()

    def _mostrar_jornadas(self, group_id: str, nombre_grupo: str):
        jornadas = JornadasPage(group_id, nombre_grupo, self._volver_grupo_detalle)
        self.content_area.content = jornadas.build()
        self.page.update()
        jornadas._cargar()

    def _mostrar_reportes(self):
        if not self.admin_phone:
            return
        reportes = ReportesPage(self.admin_phone)
        self.content_area.content = reportes.build()
        self.page.update()
        reportes._cargar()

    # ── Volver ──────────────────────────────────────────────────

    def _volver_grupos(self):
        self.page.navigation_bar.visible = True
        self.page.navigation_bar.selected_index = 1
        self._mostrar_grupos()

    def _volver_grupo_detalle(self, group_id: str, nombre: str):
        self._mostrar_grupo_detalle(group_id, nombre)

    def _navegar_a(self, destino: str, **kwargs):
        """Router simple."""
        if destino == "grupo_detalle":
            self._mostrar_grupo_detalle(
                kwargs.get("group_id", ""),
                kwargs.get("nombre", "")
            )
        elif destino == "listeros":
            self._mostrar_listeros(
                kwargs.get("group_id", ""),
                kwargs.get("nombre_grupo", "")
            )
        elif destino == "jornadas":
            self._mostrar_jornadas(
                kwargs.get("group_id", ""),
                kwargs.get("nombre_grupo", "")
            )
        elif destino == "login":
            self._mostrar_login()


def main(page: ft.Page):
    ContadorPPLApp(page)


if __name__ == "__main__":
    ft.app(target=main)
