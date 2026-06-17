"""Pantalla de inicio / Dashboard principal."""

import flet as ft
from config import COLOR_PRIMARY, COLOR_ACCENT, COLOR_CARD, COLOR_TEXT, COLOR_TEXT_SECONDARY, \
    COLOR_SUCCESS, COLOR_WARNING, COLOR_ERROR
from services.api import api


class HomePage:
    """Dashboard principal con tarjetas de resumen."""

    def __init__(self, admin_phone: str, navegar):
        self.admin_phone = admin_phone
        self.navegar = navegar
        self.stats_container = ft.Ref[ft.Column]()
        self.grupos_list = ft.Ref[ft.Column]()

    def build(self):
        return ft.Container(
            expand=True,
            padding=ft.Padding(0, 40, 0, 0),
            content=ft.Column([
                # Header
                ft.Container(
                    padding=ft.Padding(20, 10, 20, 20),
                    bgcolor=COLOR_PRIMARY,
                    content=ft.Column([
                        ft.Row([
                            ft.Icon(ft.Icons.CASINO, color=COLOR_ACCENT, size=28),
                            ft.Text("ContadorPPL", size=20, weight=ft.FontWeight.BOLD, color=ft.Colors.WHITE),
                        ]),
                        ft.Text(f"Admin: +{self.admin_phone}", color=ft.Colors.WHITE70, size=12),
                    ]),
                ),

                # Contenido scrolleable
                ft.Container(
                    expand=True,
                    content=ft.Column([
                        # Stats cards (se llenan en _cargar)
                        ft.Container(
                            ref=self.stats_container,
                            padding=15,
                            content=ft.Column(spacing=10),
                        ),

                        # Grupos recientes
                        ft.Container(
                            padding=ft.Padding(15, 0, 15, 10),
                            content=ft.Text("Tus grupos", size=16, weight=ft.FontWeight.BOLD,
                                          color=COLOR_TEXT),
                        ),
                        ft.Container(
                            expand=True,
                            ref=self.grupos_list,
                            padding=ft.Padding(15, 0, 15, 20),
                            content=ft.Column(spacing=10, scroll=ft.ScrollMode.AUTO),
                        ),
                    ], scroll=ft.ScrollMode.AUTO),
                ),
            ]),
        )

    def did_mount(self):
        """Se llama cuando la página se monta. Cargar datos."""
        self._cargar_datos()

    def _cargar_datos(self):
        # Cargar estadísticas
        stats = api.estadisticas(self.admin_phone)
        grupos = api.listar_grupos(self.admin_phone)
        status = api.status()

        # ── Tarjetas de stats ──
        cards = [
            self._stat_card("Grupos", str(stats.get("totalGrupos", 0)),
                           ft.Icons.GROUPS, COLOR_PRIMARY),
            self._stat_card("Jornadas activas", str(stats.get("jornadasActivas", 0)),
                           ft.Icons.PLAY_CIRCLE, COLOR_ACCENT),
            self._stat_card("Listeros", str(stats.get("totalListeros", 0)),
                           ft.Icons.PEOPLE, COLOR_SUCCESS),
            self._stat_card("Bot", "Online" if status.get("online") else "Offline",
                           ft.Icons.CLOUD,
                           COLOR_SUCCESS if status.get("online") else COLOR_ERROR),
        ]

        self.stats_container.current.content = ft.Column(
            controls=[
                ft.Row(
                    controls=cards[:2],
                    spacing=10,
                ),
                ft.Row(
                    controls=cards[2:],
                    spacing=10,
                ),
            ]
        )

        # ── Lista de grupos ──
        grupos_widgets = []
        for g in grupos:
            color = COLOR_SUCCESS if g.get("jornadaActiva") else COLOR_TEXT_SECONDARY
            grupos_widgets.append(
                ft.Card(
                    color=COLOR_CARD,
                    elevation=2,
                    content=ft.Container(
                        padding=15,
                        content=ft.Row([
                            ft.Column([
                                ft.Text(g.get("loteriaActual", "Florida")[:12] or "Grupo",
                                       weight=ft.FontWeight.BOLD, color=COLOR_TEXT),
                                ft.Text(f"ID: {g.get('groupId', '')[:18]}...",
                                       size=11, color=COLOR_TEXT_SECONDARY),
                            ], expand=True),
                            ft.Column([
                                ft.Text("● Activa" if g.get("jornadaActiva") else "○ Inactiva",
                                       size=12, color=color),
                                ft.Text(f"{g.get('listerosCount', 0)} listeros",
                                       size=11, color=COLOR_TEXT_SECONDARY),
                            ], horizontal_alignment=ft.CrossAxisAlignment.END),
                        ]),
                        on_click=lambda e, gid=g.get("groupId", ""), lote=g.get("loteriaActual", "Florida"):
                            self.navegar("grupo_detalle", group_id=gid, nombre=lote),
                    ),
                ),
            )

        if not grupos_widgets:
            grupos_widgets.append(
                ft.Container(
                    alignment=ft.alignment.center,
                    padding=40,
                    content=ft.Column([
                        ft.Icon(ft.Icons.GROUP_ADD_OUTLINED, size=48, color=COLOR_TEXT_SECONDARY),
                        ft.Text("No tienes grupos asignados",
                               color=COLOR_TEXT_SECONDARY, size=14),
                    ], horizontal_alignment=ft.CrossAxisAlignment.CENTER),
                ),
            )

        self.grupos_list.current.content = ft.Column(
            controls=grupos_widgets, spacing=8, scroll=ft.ScrollMode.AUTO,
        )

    def _stat_card(self, title: str, value: str, icon, color) -> ft.Container:
        return ft.Container(
            expand=True,
            padding=15,
            border_radius=12,
            bgcolor=COLOR_CARD,
            content=ft.Column([
                ft.Icon(icon, color=color, size=24),
                ft.Text(value, size=22, weight=ft.FontWeight.BOLD, color=color),
                ft.Text(title, size=11, color=COLOR_TEXT_SECONDARY),
            ], spacing=4),
        )
