"""Gestión de listeros — CRUD completo."""

import flet as ft
from config import COLOR_PRIMARY, COLOR_ACCENT, COLOR_CARD, COLOR_TEXT, COLOR_TEXT_SECONDARY, \
    COLOR_SUCCESS, COLOR_ERROR, COLOR_WARNING, COLOR_BG
from services.api import api


class ListerosPage:
    """Administrar listeros de un grupo."""

    def __init__(self, group_id: str, nombre_grupo: str, volver):
        self.group_id = group_id
        self.nombre_grupo = nombre_grupo
        self.volver = volver
        self.lista_ref = ft.Ref[ft.Column]()
        self.listeros_data = []

        # Ref para diálogo de agregar
        self.dlg_nombre = ft.Ref[ft.TextField]()
        self.dlg_phone = ft.Ref[ft.TextField]()
        self.dlg_porciento = ft.Ref[ft.TextField]()
        self.dlg_horario = ft.Ref[ft.Dropdown]()
        self.dlg_error = ft.Ref[ft.Text]()
        self.dialog = ft.Ref[ft.AlertDialog]()

    def build(self):
        return ft.Container(
            expand=True,
            bgcolor=COLOR_BG,
            padding=ft.Padding(0, 40, 0, 0),
            content=ft.Column([
                # Header
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
                            ft.Text("Listeros", size=20, weight=ft.FontWeight.BOLD,
                                   color=ft.Colors.WHITE),
                            ft.Container(expand=True),
                            ft.IconButton(
                                icon=ft.Icons.ADD,
                                icon_color=ft.Colors.WHITE,
                                bgcolor=ft.Colors.with_opacity(0.2, ft.Colors.WHITE),
                                on_click=lambda e: self._mostrar_dialogo_agregar(),
                            ),
                        ]),
                        ft.Text(self.nombre_grupo, color=ft.Colors.WHITE70, size=12),
                    ]),
                ),
                # Lista
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
        self.listeros_data = api.listar_listeros(self.group_id)
        widgets = []

        if not self.listeros_data:
            widgets.append(
                ft.Container(
                    alignment=ft.alignment.center,
                    padding=40,
                    content=ft.Column([
                        ft.Icon(ft.Icons.PERSON_OFF, size=48, color=COLOR_TEXT_SECONDARY),
                        ft.Text("No hay listeros registrados",
                               color=COLOR_TEXT_SECONDARY, size=14),
                        ft.Text("Toca + para agregar", size=12, color=COLOR_TEXT_SECONDARY),
                    ], horizontal_alignment=ft.CrossAxisAlignment.CENTER),
                )
            )
        else:
            for idx, l in enumerate(self.listeros_data):
                activo = l.get("activo", True)
                color_estado = COLOR_SUCCESS if activo else COLOR_ERROR
                widgets.append(
                    ft.Card(
                        color=COLOR_CARD,
                        elevation=2,
                        margin=ft.Margin(0, 0, 0, 8),
                        content=ft.Container(
                            padding=10,
                            content=ft.Row([
                                # Avatar con inicial
                                ft.Container(
                                    width=40, height=40,
                                    border_radius=20,
                                    bgcolor=COLOR_PRIMARY,
                                    alignment=ft.alignment.center,
                                    content=ft.Text(
                                        l.get("nombre", "?")[0].upper(),
                                        color=ft.Colors.WHITE,
                                        weight=ft.FontWeight.BOLD,
                                        size=16,
                                    ),
                                ),
                                # Info
                                ft.Column([
                                    ft.Text(l.get("nombre", "Sin nombre"),
                                           weight=ft.FontWeight.BOLD, color=COLOR_TEXT, size=14),
                                    ft.Text(f"+{l.get('phone', '')}",
                                           size=11, color=COLOR_TEXT_SECONDARY),
                                ], expand=True),
                                # Métricas
                                ft.Column([
                                    ft.Text(f"{l.get('porciento', 0)}%",
                                           size=14, color=COLOR_ACCENT, weight=ft.FontWeight.BOLD),
                                    ft.Text("Activo" if activo else "Inactivo",
                                           size=10, color=color_estado),
                                ], horizontal_alignment=ft.CrossAxisAlignment.END),
                                # Toggle activo/inactivo
                                ft.IconButton(
                                    icon=ft.Icons.TOGGLE_ON if activo else ft.Icons.TOGGLE_OFF,
                                    icon_color=color_estado,
                                    icon_size=20,
                                    tooltip="Activar/Desactivar",
                                    on_click=lambda e, i=idx: self._toggle_activo(i),
                                ),
                                # Eliminar
                                ft.IconButton(
                                    icon=ft.Icons.DELETE_OUTLINE,
                                    icon_color=COLOR_ERROR,
                                    icon_size=18,
                                    tooltip="Eliminar",
                                    on_click=lambda e, i=idx: self._eliminar_listero(i),
                                ),
                            ], spacing=8),
                        ),
                    ),
                )

        self.lista_ref.current.content = ft.Column(
            controls=widgets, spacing=0, scroll=ft.ScrollMode.AUTO,
        )
        self.lista_ref.current.page.update() if self.lista_ref.current.page else None

    def _toggle_activo(self, idx: int):
        l = self.listeros_data[idx]
        nuevo_estado = not l.get("activo", True)
        api.actualizar_listero(self.group_id, l["phone"], {"activo": nuevo_estado})
        l["activo"] = nuevo_estado
        self._cargar()

    def _eliminar_listero(self, idx: int):
        l = self.listeros_data[idx]
        api.eliminar_listero(self.group_id, l["phone"])
        self.listeros_data.pop(idx)
        self._cargar()

    def _mostrar_dialogo_agregar(self):
        self.dialog.current = ft.AlertDialog(
            title=ft.Text("Agregar Listero", color=COLOR_TEXT),
            content=ft.Column([
                ft.TextField(ref=self.dlg_nombre, label="Nombre",
                           border_color=COLOR_PRIMARY, height=50),
                ft.TextField(ref=self.dlg_phone, label="Teléfono (8 dígitos)",
                           keyboard_type=ft.KeyboardType.PHONE,
                           prefix_text="+53 ",
                           border_color=COLOR_PRIMARY, height=50),
                ft.TextField(ref=self.dlg_porciento, label="Porciento (%)",
                           value="0", keyboard_type=ft.KeyboardType.NUMBER,
                           border_color=COLOR_PRIMARY, height=50),
                ft.Dropdown(
                    ref=self.dlg_horario,
                    label="Horario permitido",
                    value="ambos",
                    options=[
                        ft.dropdown.Option("ambos", "Ambos"),
                        ft.dropdown.Option("mañana", "Mañana"),
                        ft.dropdown.Option("tarde", "Tarde"),
                    ],
                    border_color=COLOR_PRIMARY,
                ),
                ft.Text(ref=self.dlg_error, color=COLOR_ERROR, size=12, visible=False),
            ], spacing=10, height=280, scroll=ft.ScrollMode.AUTO),
            actions=[
                ft.TextButton("Cancelar", on_click=lambda e: self._cerrar_dialogo()),
                ft.ElevatedButton("Guardar", bgcolor=COLOR_PRIMARY, color=ft.Colors.WHITE,
                                on_click=lambda e: self._guardar_listero()),
            ],
        )
        self.lista_ref.current.page.dialog = self.dialog.current
        self.dialog.current.open = True
        self.lista_ref.current.page.update()

    def _cerrar_dialogo(self):
        self.dialog.current.open = False
        self.lista_ref.current.page.update()

    def _guardar_listero(self):
        nombre = (self.dlg_nombre.current.value or "").strip()
        phone = (self.dlg_phone.current.value or "").strip()
        porciento = int(self.dlg_porciento.current.value or "0")
        horario = self.dlg_horario.current.value or "ambos"

        if not nombre or not phone or len(phone) < 8:
            self.dlg_error.current.value = "Nombre y teléfono son obligatorios"
            self.dlg_error.current.visible = True
            self.lista_ref.current.page.update()
            return

        full_phone = f"53{phone}"
        api.agregar_listero(self.group_id, full_phone, nombre, porciento, horario)

        self._cerrar_dialogo()
        self._cargar()
