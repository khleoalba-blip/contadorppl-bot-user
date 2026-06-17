"""Resumen y reportes generales."""

import flet as ft
from config import COLOR_PRIMARY, COLOR_ACCENT, COLOR_CARD, COLOR_TEXT, COLOR_TEXT_SECONDARY, \
    COLOR_SUCCESS, COLOR_ERROR, COLOR_BG
from services.api import api


class ReportesPage:
    """Estadísticas y resumen general."""

    def __init__(self, admin_phone: str):
        self.admin_phone = admin_phone
        self.content_ref = ft.Ref[ft.Column]()

    def build(self):
        return ft.Container(
            expand=True,
            bgcolor=COLOR_BG,
            padding=ft.Padding(0, 40, 0, 0),
            content=ft.Column([
                ft.Container(
                    padding=ft.Padding(20, 5, 20, 15),
                    content=ft.Text("Reportes", size=22, weight=ft.FontWeight.BOLD,
                                   color=COLOR_TEXT),
                ),
                ft.Container(
                    expand=True,
                    ref=self.content_ref,
                    padding=15,
                ),
            ]),
        )

    def did_mount(self):
        self._cargar()

    def _cargar(self):
        stats = api.estadisticas(self.admin_phone)
        status = api.status()
        grupos = api.listar_grupos(self.admin_phone)

        # Stats generales en grid 2x2
        cards_grid = ft.Row([
            ft.Column([
                self._stat_card("Grupos", str(stats.get("totalGrupos", 0)),
                               ft.Icons.GROUPS, COLOR_PRIMARY),
                self._stat_card("Listeros", str(stats.get("totalListeros", 0)),
                               ft.Icons.PEOPLE, COLOR_SUCCESS),
            ], expand=True, spacing=10),
            ft.Column([
                self._stat_card("Jornadas activas", str(stats.get("jornadasActivas", 0)),
                               ft.Icons.PLAY_CIRCLE, COLOR_ACCENT),
                self._stat_card("Bot", "Online" if status.get("online") else "Offline",
                               ft.Icons.CLOUD,
                               COLOR_SUCCESS if status.get("online") else COLOR_ERROR),
            ], expand=True, spacing=10),
        ], spacing=10)

        # Detalle por grupo
        grupo_widgets = []
        for g in grupos:
            gid = g.get("groupId", "")
            loteria = g.get("loteriaActual", "Florida")
            activa = g.get("jornadaActiva")
            grupo_widgets.append(
                ft.Card(
                    color=COLOR_CARD,
                    elevation=2,
                    margin=ft.Margin(0, 0, 0, 8),
                    content=ft.Container(
                        padding=12,
                        content=ft.Row([
                            ft.Column([
                                ft.Text(loteria, weight=ft.FontWeight.BOLD,
                                       color=COLOR_TEXT, size=13),
                                ft.Text(f"ID: {gid[:18]}...",
                                       size=10, color=COLOR_TEXT_SECONDARY),
                            ], expand=True),
                            ft.Column([
                                ft.Text("●" if activa else "○",
                                       color=COLOR_SUCCESS if activa else COLOR_TEXT_SECONDARY,
                                       size=20),
                                ft.Text("Activa" if activa else "Inactiva",
                                       size=10, color=COLOR_TEXT_SECONDARY),
                            ], horizontal_alignment=ft.CrossAxisAlignment.END),
                        ]),
                    ),
                ),
            )

        # Información de conexión
        info_card = ft.Card(
            color=COLOR_CARD,
            elevation=2,
            content=ft.Container(
                padding=15,
                content=ft.Column([
                    ft.Text("Información del sistema", weight=ft.FontWeight.BOLD,
                           color=COLOR_TEXT, size=15),
                    ft.Divider(color=COLOR_TEXT_SECONDARY, height=1),
                    ft.Row([
                        ft.Text("MongoDB", color=COLOR_TEXT_SECONDARY, size=13),
                        ft.Container(expand=True),
                        ft.Text("Activo" if status.get("mongoActivo") else "Inactivo",
                               color=COLOR_SUCCESS if status.get("mongoActivo") else COLOR_ERROR,
                               size=13, weight=ft.FontWeight.W_500),
                    ]),
                    ft.Row([
                        ft.Text("API", color=COLOR_TEXT_SECONDARY, size=13),
                        ft.Container(expand=True),
                        ft.Text("Conectado" if status.get("online") else "Error",
                               color=COLOR_SUCCESS if status.get("online") else COLOR_ERROR,
                               size=13, weight=ft.FontWeight.W_500),
                    ]),
                    ft.Row([
                        ft.Text("Versión bot", color=COLOR_TEXT_SECONDARY, size=13),
                        ft.Container(expand=True),
                        ft.Text(status.get("version", "?"),
                               color=COLOR_TEXT, size=13, weight=ft.FontWeight.W_500),
                    ]),
                ], spacing=8),
            ),
        )

        self.content_ref.current.content = ft.Column(
            controls=[
                cards_grid,
                ft.Container(height=15),
                ft.Text("Estado por grupo", size=15, weight=ft.FontWeight.BOLD, color=COLOR_TEXT),
                *grupo_widgets,
                ft.Container(height=10),
                info_card,
            ],
            scroll=ft.ScrollMode.AUTO,
        )
        self.content_ref.current.page.update() if self.content_ref.current.page else None

    def _stat_card(self, title: str, value: str, icon, color) -> ft.Container:
        return ft.Container(
            expand=True,
            padding=15,
            border_radius=12,
            bgcolor=COLOR_CARD,
            content=ft.Column([
                ft.Icon(icon, color=color, size=28),
                ft.Text(value, size=24, weight=ft.FontWeight.BOLD, color=color),
                ft.Text(title, size=12, color=COLOR_TEXT_SECONDARY),
            ], spacing=4),
        )
