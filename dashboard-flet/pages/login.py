"""Página de login — validación por número de teléfono."""

import flet as ft
from config import COLOR_PRIMARY, COLOR_ACCENT, COLOR_CARD, COLOR_TEXT, COLOR_TEXT_SECONDARY, COLOR_BG
from services.api import api


class LoginPage:
    """Pantalla de inicio de sesión."""

    def __init__(self, on_success):
        self.on_success = on_success
        self.error_text = ft.Ref[ft.Text]()
        self.phone_input = ft.Ref[ft.TextField]()
        self.login_btn = ft.Ref[ft.ElevatedButton]()
        self.loading = ft.Ref[ft.ProgressBar]()

    def build(self):
        return ft.Container(
            expand=True,
            bgcolor=COLOR_BG,
            alignment=ft.alignment.center,
            padding=30,
            content=ft.Column(
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=20,
                controls=[
                    ft.Container(height=40),
                    # Logo / Icono
                    ft.Icon(ft.Icons.CASINO_OUTLINED, size=80, color=COLOR_ACCENT),
                    ft.Text("ContadorPPL", size=32, weight=ft.FontWeight.BOLD,
                            color=COLOR_PRIMARY),
                    ft.Text("Dashboard de Administración",
                            size=14, color=COLOR_TEXT_SECONDARY),
                    ft.Container(height=20),
                    # Campo de teléfono
                    ft.Container(
                        width=320,
                        content=ft.Column([
                            ft.Text("Número de teléfono", color=COLOR_TEXT_SECONDARY, size=12),
                            ft.TextField(
                                ref=self.phone_input,
                                hint_text="5356965304",
                                prefix_text="+53 ",
                                keyboard_type=ft.KeyboardType.PHONE,
                                border_color=COLOR_PRIMARY,
                                focused_border_color=COLOR_ACCENT,
                                bgcolor=COLOR_CARD,
                                color=COLOR_TEXT,
                                text_size=18,
                                max_length=8,
                                on_submit=lambda e: self._login(),
                            ),
                        ]),
                    ),
                    ft.Text(ref=self.error_text, color=ft.Colors.RED_400, size=13, visible=False),
                    ft.ProgressBar(ref=self.loading, color=COLOR_ACCENT, visible=False, width=200),
                    ft.ElevatedButton(
                        ref=self.login_btn,
                        text="Entrar",
                        icon=ft.Icons.LOGIN,
                        style=ft.ButtonStyle(
                            bgcolor=COLOR_PRIMARY,
                            color=ft.Colors.WHITE,
                            padding=ft.Padding(40, 15, 40, 15),
                            shape=ft.RoundedRectangleBorder(radius=12),
                        ),
                        on_click=lambda e: self._login(),
                    ),
                    ft.Container(height=20),
                    ft.Text("Solo para usuarios autorizados",
                            size=11, color=COLOR_TEXT_SECONDARY, italic=True),
                ],
            ),
        )

    def _login(self):
        phone = (self.phone_input.current.value or "").strip()
        if not phone or len(phone) < 8:
            self._mostrar_error("Ingresa un número válido (8 dígitos)")
            return

        self._set_loading(True)
        self._mostrar_error(None)

        full_phone = f"53{phone}"

        try:
            resultado = api.login(full_phone)

            if resultado.get("autorizado"):
                self.on_success(
                    {"nombre": resultado.get("nombre", ""), "telefono": full_phone},
                    full_phone,
                )
            else:
                self._mostrar_error("Número no autorizado. Contacta al admin.")
        except Exception as e:
            self._mostrar_error(f"Error de conexión: {e}")
        finally:
            self._set_loading(False)

    def _set_loading(self, loading: bool):
        self.loading.current.visible = loading
        self.login_btn.current.disabled = loading
        self.loading.current.page.update() if self.loading.current.page else None

    def _mostrar_error(self, msg: str | None):
        if self.error_text.current:
            self.error_text.current.value = msg or ""
            self.error_text.current.visible = bool(msg)
            if self.error_text.current.page:
                self.error_text.current.page.update()
