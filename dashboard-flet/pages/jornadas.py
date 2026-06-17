"""Historial de jornadas."""

import flet as ft
from config import COLOR_PRIMARY, COLOR_ACCENT, COLOR_CARD, COLOR_TEXT, COLOR_TEXT_SECONDARY, \
    COLOR_SUCCESS, COLOR_ERROR, COLOR_WARNING, COLOR_BG
from services.api import api
from datetime import datetime


class JornadasPage:
    """Vista de jornadas activas y cerradas."""

    def __init__(self, group_id: str, nombre_grupo: str, volver):
        self.group_id = group_id
        self.nombre_grupo = nombre_grupo
        self.volver = volver
        self.lista_ref = ft.Ref[ft.Column]()

    def build(self):
        return ft.Container(
            expand=True,
            bgcolor=COLOR_BG,
            padding=ft.Padding(0, 40, 0, 0),
            content=ft.Column([
                ft.Container(
                    bgcolor=COLOR_PRIMARY,
                    padding=ft.Padding(10, 5, 15, 15),
                    content=ft.Column([
                        ft.Row([
                            ft.IconButton(
                                icon=ft.Icons.ARROW_BACK,
                                icon_color=ft.Colors.WHITE,
                                on_click=lambda e: self.volver(self.group_id, self.nombre_grupo),
                            ),
                            ft.Text("Jornadas", size=20, weight=ft.FontWeight.BOLD,
                                   color=ft.Colors.WHITE),
                        ]),
                        ft.Text(self.nombre_grupo, color=ft.Colors.WHITE70, size=12),
                    ]),
                ),
                ft.Container(
                    expand=True,
                    ref=self.lista_ref,
                    padding=ft.Padding(15, 10, 15, 80),
                ),
            ]),
        )

    def did_mount(self):
        self._cargar()

    def _cargar(self):
        jornadas = api.listar_jornadas(self.group_id)
        widgets = []

        if not jornadas:
            widgets.append(
                ft.Container(
                    alignment=ft.alignment.center,
                    padding=40,
                    content=ft.Text("No hay jornadas registradas",
                                   color=COLOR_TEXT_SECONDARY, size=14),
                ),
            )
        else:
            for j in jornadas:
                estado = j.get("estado", "desconocida")
                if estado == "activa":
                    color = COLOR_SUCCESS
                    icono = ft.Icons.PLAY_CIRCLE_FILLED
                elif estado == "cerrada":
                    color = COLOR_TEXT_SECONDARY
                    icono = ft.Icons.CHECK_CIRCLE
                else:
                    color = COLOR_WARNING
                    icono = ft.Icons.HELP

                inicio = j.get("inicio", "")
                fin = j.get("finReal", "") or j.get("fin", "")
                try:
                    fecha_inicio = datetime.fromisoformat(inicio.replace("Z", "+00:00"))
                    inicio_str = fecha_inicio.strftime("%d/%m %H:%M")
                except:
                    inicio_str = inicio[:16] if inicio else "?"

                widgets.append(
                    ft.Card(
                        color=COLOR_CARD,
                        elevation=2,
                        margin=ft.Margin(0, 0, 0, 8),
                        content=ft.Container(
                            padding=12,
                            content=ft.Row([
                                ft.Icon(icono, color=color, size=24),
                                ft.Column([
                                    ft.Text(
                                        f"Jornada {j.get('jornadaId', '?')[:20]}",
                                        weight=ft.FontWeight.BOLD, color=COLOR_TEXT, size=13,
                                    ),
                                    ft.Text(
                                        f"Inicio: {inicio_str} | Lotería: {j.get('loteria', '?')}",
                                        size=11, color=COLOR_TEXT_SECONDARY,
                                    ),
                                    # Mostrar mensajes si es activa
                                    ft.Text(
                                        f"Mensajes: {j.get('mensajesCount', 0)} | "
                                        f"Estado: {estado.upper()}",
                                        size=11, color=color,
                                    ) if estado == "activa" else ft.Text(""),
                                ], expand=True),
                            ], spacing=10),
                        ),
                    ),
                )

        self.lista_ref.current.content = ft.Column(
            controls=widgets, spacing=0, scroll=ft.ScrollMode.AUTO,
        )
        self.lista_ref.current.page.update() if self.lista_ref.current.page else None
