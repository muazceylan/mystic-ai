import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  AppTheme._();

  // Mystical Colors
  static const Color darkBackground = Color(0xFF0D0D0D);
  static const Color darkSurface = Color(0xFF1A1A2E);
  static const Color darkCard = Color(0xFF16213E);
  static const Color goldPrimary = Color(0xFFD4AF37);
  static const Color goldLight = Color(0xFFF4E4BC);
  static const Color goldDark = Color(0xFFB8941F);
  static const Color purplePrimary = Color(0xFF9D4EDD);
  static const Color purpleLight = Color(0xFFC77DFF);
  static const Color purpleDark = Color(0xFF7B2CBF);
  static const Color accentTeal = Color(0xFF00D9FF);
  static const Color accentRose = Color(0xFFFF006E);
  static const Color textPrimary = Color(0xFFF8F9FA);
  static const Color textSecondary = Color(0xFFADB5BD);
  static const Color textMuted = Color(0xFF6C757D);
  static const Color error = Color(0xFFE63946);
  static const Color success = Color(0xFF2ECC71);
  static const Color warning = Color(0xFFF39C12);

  // Gradients
  static const LinearGradient goldGradient = LinearGradient(
    colors: [goldPrimary, goldLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient purpleGradient = LinearGradient(
    colors: [purpleDark, purplePrimary, purpleLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient mysticalGradient = LinearGradient(
    colors: [darkSurface, darkCard, Color(0xFF2D1B4E)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [darkCard, Color(0xFF1F2937)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Shadows
  static List<BoxShadow> get mysticalShadow => [
    BoxShadow(
      color: purplePrimary.withOpacity(0.3),
      blurRadius: 20,
      spreadRadius: 2,
    ),
  ];

  static List<BoxShadow> get goldShadow => [
    BoxShadow(
      color: goldPrimary.withOpacity(0.4),
      blurRadius: 15,
      spreadRadius: 1,
    ),
  ];

  // Theme Data
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBackground,
      colorScheme: const ColorScheme.dark(
        primary: goldPrimary,
        secondary: purplePrimary,
        surface: darkSurface,
        background: darkBackground,
        error: error,
        onPrimary: darkBackground,
        onSecondary: textPrimary,
        onSurface: textPrimary,
        onBackground: textPrimary,
        onError: textPrimary,
      ),
      textTheme: _buildTextTheme(),
      appBarTheme: _buildAppBarTheme(),
      cardTheme: _buildCardTheme(),
      elevatedButtonTheme: _buildElevatedButtonTheme(),
      outlinedButtonTheme: _buildOutlinedButtonTheme(),
      textButtonTheme: _buildTextButtonTheme(),
      inputDecorationTheme: _buildInputDecorationTheme(),
      bottomNavigationBarTheme: _buildBottomNavTheme(),
      dividerTheme: const DividerThemeData(
        color: textMuted,
        thickness: 0.5,
      ),
    );
  }

  static TextTheme _buildTextTheme() {
    final baseTextTheme = GoogleFonts.cinzelTextTheme(ThemeData.dark().textTheme);
    final bodyTextTheme = GoogleFonts.latoTextTheme(ThemeData.dark().textTheme);
    
    return TextTheme(
      displayLarge: baseTextTheme.displayLarge?.copyWith(
        color: goldPrimary,
        fontWeight: FontWeight.bold,
        letterSpacing: 2,
      ),
      displayMedium: baseTextTheme.displayMedium?.copyWith(
        color: goldLight,
        fontWeight: FontWeight.w600,
        letterSpacing: 1.5,
      ),
      displaySmall: baseTextTheme.displaySmall?.copyWith(
        color: textPrimary,
        fontWeight: FontWeight.w600,
      ),
      headlineLarge: baseTextTheme.headlineLarge?.copyWith(
        color: goldPrimary,
        fontWeight: FontWeight.bold,
      ),
      headlineMedium: baseTextTheme.headlineMedium?.copyWith(
        color: textPrimary,
        fontWeight: FontWeight.w600,
      ),
      headlineSmall: baseTextTheme.headlineSmall?.copyWith(
        color: purpleLight,
        fontWeight: FontWeight.w500,
      ),
      titleLarge: bodyTextTheme.titleLarge?.copyWith(
        color: textPrimary,
        fontWeight: FontWeight.w600,
      ),
      titleMedium: bodyTextTheme.titleMedium?.copyWith(
        color: textSecondary,
        fontWeight: FontWeight.w500,
      ),
      titleSmall: bodyTextTheme.titleSmall?.copyWith(
        color: textMuted,
        fontWeight: FontWeight.w400,
      ),
      bodyLarge: bodyTextTheme.bodyLarge?.copyWith(
        color: textPrimary,
        height: 1.6,
      ),
      bodyMedium: bodyTextTheme.bodyMedium?.copyWith(
        color: textSecondary,
        height: 1.5,
      ),
      bodySmall: bodyTextTheme.bodySmall?.copyWith(
        color: textMuted,
        height: 1.4,
      ),
      labelLarge: bodyTextTheme.labelLarge?.copyWith(
        color: goldPrimary,
        fontWeight: FontWeight.w600,
        letterSpacing: 1,
      ),
      labelMedium: bodyTextTheme.labelMedium?.copyWith(
        color: purpleLight,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.5,
      ),
      labelSmall: bodyTextTheme.labelSmall?.copyWith(
        color: textMuted,
        fontWeight: FontWeight.w400,
        letterSpacing: 0.5,
      ),
    );
  }

  static AppBarTheme _buildAppBarTheme() {
    return AppBarTheme(
      backgroundColor: darkSurface.withOpacity(0.95),
      elevation: 0,
      centerTitle: true,
      titleTextStyle: GoogleFonts.cinzel(
        color: goldPrimary,
        fontSize: 20,
        fontWeight: FontWeight.bold,
        letterSpacing: 2,
      ),
      iconTheme: const IconThemeData(color: goldPrimary),
    );
  }

  static CardThemeData _buildCardTheme() {
    return CardThemeData(
      color: darkCard,
      elevation: 8,
      shadowColor: purplePrimary.withOpacity(0.3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: goldPrimary.withOpacity(0.2),
          width: 1,
        ),
      ),
    );
  }

  static ElevatedButtonThemeData _buildElevatedButtonTheme() {
    return ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: goldPrimary,
        foregroundColor: darkBackground,
        elevation: 4,
        shadowColor: goldPrimary.withOpacity(0.4),
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: GoogleFonts.cinzel(
          fontWeight: FontWeight.w600,
          fontSize: 16,
          letterSpacing: 1,
        ),
      ),
    );
  }

  static OutlinedButtonThemeData _buildOutlinedButtonTheme() {
    return OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: goldPrimary,
        side: const BorderSide(color: goldPrimary, width: 1.5),
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: GoogleFonts.cinzel(
          fontWeight: FontWeight.w600,
          fontSize: 16,
          letterSpacing: 1,
        ),
      ),
    );
  }

  static TextButtonThemeData _buildTextButtonTheme() {
    return TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: purpleLight,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        textStyle: GoogleFonts.lato(
          fontWeight: FontWeight.w600,
          fontSize: 14,
        ),
      ),
    );
  }

  static InputDecorationTheme _buildInputDecorationTheme() {
    return InputDecorationTheme(
      filled: true,
      fillColor: darkCard,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: goldPrimary.withOpacity(0.3)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: goldPrimary.withOpacity(0.3)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: goldPrimary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: error, width: 1),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: error, width: 2),
      ),
      labelStyle: GoogleFonts.lato(color: textSecondary),
      hintStyle: GoogleFonts.lato(color: textMuted),
      prefixIconColor: goldPrimary,
      suffixIconColor: purpleLight,
    );
  }

  static BottomNavigationBarThemeData _buildBottomNavTheme() {
    return BottomNavigationBarThemeData(
      backgroundColor: darkSurface,
      selectedItemColor: goldPrimary,
      unselectedItemColor: textMuted,
      selectedLabelStyle: GoogleFonts.lato(
        fontWeight: FontWeight.w600,
        fontSize: 12,
      ),
      unselectedLabelStyle: GoogleFonts.lato(
        fontWeight: FontWeight.w400,
        fontSize: 12,
      ),
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    );
  }
}
