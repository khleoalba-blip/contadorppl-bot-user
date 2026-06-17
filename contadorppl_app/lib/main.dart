import 'package:flutter/material.dart';
import 'config.dart';
import 'pages/login_page.dart';

void main() {
  runApp(const ContadorPPLApp());
}

class ContadorPPLApp extends StatelessWidget {
  const ContadorPPLApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ContadorPPL',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        colorScheme: ColorScheme.dark(
          primary: const Color(AppConfig.colorPrimary),
          secondary: const Color(AppConfig.colorAccent),
          surface: const Color(AppConfig.colorBg),
          error: const Color(AppConfig.colorError),
          onPrimary: Colors.white,
          onSecondary: Colors.black,
          onSurface: const Color(AppConfig.colorText),
        ),
        scaffoldBackgroundColor: const Color(AppConfig.colorBg),
        cardColor: const Color(AppConfig.colorCard),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(AppConfig.colorPrimary),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(AppConfig.colorPrimary),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(AppConfig.colorPrimary)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(AppConfig.colorAccent), width: 2),
          ),
          filled: true,
          fillColor: const Color(AppConfig.colorCard),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Color(0xFF1E1E3A),
          selectedItemColor: Color(AppConfig.colorAccent),
          unselectedItemColor: Color(AppConfig.colorTextSecondary),
        ),
        useMaterial3: true,
      ),
      home: const LoginPage(),
    );
  }
}
