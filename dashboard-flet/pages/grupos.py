"""Lista de grupos del admin."""

import flet as ft
from config import COLOR_PRIMARY, COLOR_ACCENT, COLOR_CARD, COLOR_TEXT, \
    COLOR_TEXT_SECONDARY, COLOR_SUCCESS, COLOR_BG
from services.api import api


class GruposPage:
    """Lista de grupos administrados."""

    def __init__(self, admin_phone: str, navegar):
        self.admin_phone = admin_phone
        self.navegar = navegar
        self.grupos_list = ft.Ref[ft.Column]()
        self.loading = ft.Ref[ft.ProgressBar]()

    def build(self):
        return ft.Container(
            expand=True,
            bgcolor=COLOR_BG,
            padding=ft.Padding(0, 40, 0, 0),
            content=ft.Column([
                # Header
                ft.Container(
                    padding=ft.Padding(20, 5, 20, 15),
                    content=ft.Column([
                        ft.Text("Mis Grupos", size=22, weight=ft.FontWeight.BOLD,
                               color=COLOR_TEXT),
                        ft.ProgressBar(ref=self.loading, color=COLOR_ACCENT, visible=False),
                    ]),
                ),
                # Lista
                ft.Container(
                    expand=True,
                    ref=self.grupos_list,
                    padding=ft.Padding(15, 0, 15, 80),
                ),
            ]),
        )

    def did_mount(self):
        self._cargar()

    def _cargar(self):
        self.loading.current.visible = True
        self.loading.current.page.update() if self.loading.current.page else None

        grupos = api.listar_grupos(self.admin_phone)

        widgets = []
        for g in grupos:
            activa = g.get("jornadaActiva")
            color_dot = COLOR_SUCCESS if activa else COLOR_TEXT_SECONDARY
            widgets.append(
                ft.Card(
                    color=COLOR_CARD,
                    elevation=3,
                    margin=ft.Margin(0, 0, 0, 8),
                    content=ft.Container(
                        padding=ft.Padding(15, 12, 15, 12),
                        on_click=lambda e, gid=g.get("groupId",""), nom=g.get("loteriaActual","Florida"):
                            self.navegar("grupo_detalle", group_id=gid, nombre=nom),
                        content=ft.Row([
                            # Info izquierda
                            ft.Column([
                                ft.Text(g.get("loteriaActual", "Florida"),
                                       size=16, weight=ft.FontWeight.BOLD, color=COLOR_TEXT),
                                ft.Text(f"Modo: {g.get('modo', 'manual')}",
                                       size=12, color=COLOR_TEXT_SECONDARY),
                            ], expand=True),
                            # Info derecha
                            ft.Column([
                                ft.Row([
                                    ft.Container(width=8, height=8,
                                        border_radius=4, bgcolor=color_dot),
                                    ft.Text("Jornada activa" if activa else "Sin jornada",
                                           size=12, color=color_dot),
                                ]),
                                ft.Text(f"{g.get('listerosCount', 0)} listeros",
                                       size=11, color=COLOR_TEXT_SECONDARY),
                            ], horizontal_alignment=ft.CrossAxisAlignment.END),
                        ]),
                    ),
                ))

        if not widgets:
            widgets.append(
                ft.Container(
                    alignment=ft.alignment.center,
                    padding=40,
                    content=ft.Column([
                        ft.Icon(ft.Icons.GROUP_OFF, size=48, color=COLOR_TEXT_SECONDARY),
                        ft.Text("No tienes grupos asignados",
                               color=COLOR_TEXT_SECONDARY, size=14),
                    ], horizontal_alignment=ft.CrossAxisAlignment.CENTER),
                ),
            )

        self.grupos_list.current.content = ft.Column(
            controls=widgets, spacing=0, scroll=ft.ScrollMode.AUTO,
        )
        self.loading.current.visible = False
        self.loading.current.page.update() if self.loading.current.page else None
