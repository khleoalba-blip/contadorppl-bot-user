"""Detalle de grupo — configuración, listeros, jornadas."""

import flet as ft
from config import COLOR_PRIMARY, COLOR_ACCENT, COLOR_CARD, COLOR_TEXT, COLOR_TEXT_SECONDARY, \
    COLOR_SUCCESS, COLOR_WARNING, COLOR_BG
from services.api import api


class GrupoDetallePage:
    """Vista detallada de un grupo."""

    def __init__(self, group_id: str, nombre: str, admin_phone: str, volver, navegar):
        self.group_id = group_id
        self.nombre = nombre
        self.admin_phone = admin_phone
        self.volver = volver
        self.navegar = navegar
        self.config = {}
        self.content_ref = ft.Ref[ft.Column]()

    def build(self):
        return ft.Container(
            expand=True,
            bgcolor=COLOR_BG,
            padding=ft.Padding(0, 40, 0, 0),
            content=ft.Column([
                # Header con botón volver
                ft.Container(
                    bgcolor=COLOR_PRIMARY,
                    padding=ft.Padding(10, 5, 15, 15),
                    content=ft.Column([
                        ft.Row([
                            ft.IconButton(
                                icon=ft.Icons.ARROW_BACK,
                                icon_color=ft.Colors.WHITE,
                                on_click=lambda e: self.volver(),
                            ),
                            ft.Text(self.nombre, size=20, weight=ft.FontWeight.BOLD,
                                   color=ft.Colors.WHITE),
                        ]),
                        ft.Text(f"ID: {self.group_id[:24]}...", color=ft.Colors.WHITE70, size=11),
                    ]),
                ),
                # Contenido
                ft.Container(
                    expand=True,
                    ref=self.content_ref,
                    padding=15,
                ),
            ]),
        )

    def did_mount(self):
        self.config = api.obtener_config_grupo(self.group_id)
        self._construir_vista()

    def _construir_vista(self):
        cfg = self.config

        # ── Tarjeta: Acciones rápidas ──
        acciones = ft.Row([
            self._accion_btn("Listeros", ft.Icons.PEOPLE, COLOR_SUCCESS,
                lambda e: self.navegar("listeros", group_id=self.group_id,
                                       nombre_grupo=self.nombre)),
            self._accion_btn("Jornadas", ft.Icons.HISTORY, COLOR_ACCENT,
                lambda e: self.navegar("jornadas", group_id=self.group_id,
                                       nombre_grupo=self.nombre)),
        ], spacing=10)

        # ── Tarjeta: Configuración ──
        config_items = [
            self._config_row("Lotería", cfg.get("loteriaActual", "Florida")),
            self._config_row("Modo", cfg.get("modo", "manual")),
            self._config_row("Jornada automática", "Sí" if cfg.get("jornadaAutomatica") else "No"),
            self._config_row("Jornada activa", cfg.get("jornadaActivaId", "Ninguna")[:30] if cfg.get("jornadaActivaId") else "Ninguna"),
        ]

        config_card = ft.Card(
            color=COLOR_CARD,
            elevation=2,
            content=ft.Container(
                padding=15,
                content=ft.Column([
                    ft.Text("Configuración", weight=ft.FontWeight.BOLD, color=COLOR_TEXT, size=15),
                    ft.Divider(color=COLOR_TEXT_SECONDARY, height=1),
                    *config_items,
                ], spacing=8),
            ),
        )

        # ── Tarjeta: Premios ──
        premios = cfg.get("configPremios", {})
        premios_items = [
            self._config_row("Parlet", f"${premios.get('Parlet', 400)}"),
            self._config_row("Centena", f"${premios.get('Centena', 400)}"),
            self._config_row("Fijo", f"${premios.get('Fijo', 80)}"),
            self._config_row("Corrido", f"${premios.get('Corrido', 20)}"),
        ]

        premios_card = ft.Card(
            color=COLOR_CARD,
            elevation=2,
            content=ft.Container(
                padding=15,
                content=ft.Column([
                    ft.Text("Premios", weight=ft.FontWeight.BOLD, color=COLOR_TEXT, size=15),
                    ft.Divider(color=COLOR_TEXT_SECONDARY, height=1),
                    *premios_items,
                ], spacing=8),
            ),
        )

        # ── Tarjeta: Horarios ──
        horarios = api.obtener_config_grupo(self.group_id)
        # Los horarios están en data/groups/<id>/horarios.json, no en config
        # Para simplificar, mostramos los defaults
        horarios_card = ft.Card(
            color=COLOR_CARD,
            elevation=2,
            content=ft.Container(
                padding=15,
                content=ft.Column([
                    ft.Text("Horarios Florida", weight=ft.FontWeight.BOLD, color=COLOR_TEXT, size=15),
                    ft.Divider(color=COLOR_TEXT_SECONDARY, height=1),
                    self._config_row("☀ Mañana", "08:00 → 13:10  (resultados 13:36)"),
                    self._config_row("🌙 Tarde", "14:00 → 21:00  (resultados 21:51)"),
                ], spacing=8),
            ),
        )

        self.content_ref.current.content = ft.Column(
            controls=[
                acciones,
                ft.Container(height=10),
                config_card,
                ft.Container(height=10),
                premios_card,
                ft.Container(height=10),
                horarios_card,
            ],
            scroll=ft.ScrollMode.AUTO,
        )
        self.content_ref.current.page.update() if self.content_ref.current.page else None

    def _accion_btn(self, texto: str, icono, color, on_click):
        return ft.Container(
            expand=True,
            height=80,
            border_radius=12,
            bgcolor=COLOR_CARD,
            on_click=on_click,
            padding=12,
            content=ft.Column([
                ft.Icon(icono, color=color, size=28),
                ft.Text(texto, size=12, color=COLOR_TEXT, weight=ft.FontWeight.W_500),
            ], horizontal_alignment=ft.CrossAxisAlignment.CENTER,
               alignment=ft.MainAxisAlignment.CENTER),
        )

    def _config_row(self, label: str, value: str):
        return ft.Row([
            ft.Text(label, size=13, color=COLOR_TEXT_SECONDARY),
            ft.Container(expand=True),
            ft.Text(value, size=13, color=COLOR_TEXT, weight=ft.FontWeight.W_500),
        ])
