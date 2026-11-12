import 'package:flutter/material.dart';

/// Design system JURU : vert profond, émeraude, blanc cassé, bleu nuit.
class K {
  static const deepGreen = Color(0xFF0B4D3A);
  static const emerald = Color(0xFF10B981);
  static const offWhite = Color(0xFFF7F5EF);
  static const night = Color(0xFF0B1B3A);
  static const danger = Color(0xFFC02636);
  static const warning = Color(0xFFB46A08);

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness b) {
    final dark = b == Brightness.dark;
    final scheme = ColorScheme.fromSeed(
      seedColor: deepGreen,
      brightness: b,
      primary: dark ? const Color(0xFF34D399) : deepGreen,
      secondary: emerald,
      surface: dark ? const Color(0xFF0E1A32) : Colors.white,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: dark ? const Color(0xFF081022) : offWhite,
      fontFamily: 'Inter',
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: dark ? const Color(0xFF243658) : const Color(0xFFE0DCCF)),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          shape: const StadiumBorder(),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(shape: const StadiumBorder(), padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}
