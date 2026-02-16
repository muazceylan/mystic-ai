import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../providers/onboarding_provider.dart';
import '../../../../core/theme/app_theme.dart';

class GenderStep extends StatelessWidget {
  const GenderStep({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OnboardingProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Icon
          Icon(
            Icons.wc_outlined,
            size: 64,
            color: AppTheme.goldPrimary.withOpacity(0.8),
          ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack),
          
          const SizedBox(height: 24),
          
          // Title
          Text(
            'Cinsiyetiniz',
            style: GoogleFonts.cinzel(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: AppTheme.goldPrimary,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(duration: 600.ms).slideY(begin: -0.2, end: 0),
          
          const SizedBox(height: 8),
          
          // Subtitle
          Text(
            'Kişiselleştirilmiş yorumlar için bu bilgiye ihtiyacımız var',
            style: GoogleFonts.lato(
              fontSize: 16,
              color: AppTheme.textSecondary,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(delay: 200.ms, duration: 600.ms),
          
          const SizedBox(height: 40),
          
          // Gender Options
          Row(
            children: [
              Expanded(
                child: _buildGenderCard(
                  context: context,
                  gender: Gender.female,
                  icon: Icons.female,
                  delay: 0,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildGenderCard(
                  context: context,
                  gender: Gender.male,
                  icon: Icons.male,
                  delay: 100,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Unspecified Option
          _buildGenderCard(
            context: context,
            gender: Gender.unspecified,
            icon: Icons.person_outline,
            isFullWidth: true,
            delay: 200,
          ),
          
          const SizedBox(height: 32),
          
          // Selected Gender Display
          if (provider.selectedGender != null)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
              decoration: BoxDecoration(
                gradient: AppTheme.goldGradient,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.check_circle,
                    color: AppTheme.darkBackground,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    provider.getGenderDisplayName(provider.selectedGender!),
                    style: GoogleFonts.cinzel(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.darkBackground,
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms).scale(),
        ],
      ),
    );
  }

  Widget _buildGenderCard({
    required BuildContext context,
    required Gender gender,
    required IconData icon,
    bool isFullWidth = false,
    required int delay,
  }) {
    final provider = context.watch<OnboardingProvider>();
    final isSelected = provider.selectedGender == gender;

    return GestureDetector(
      onTap: () {
        provider.setGender(gender);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.goldPrimary.withOpacity(0.1)
              : AppTheme.darkCard.withOpacity(0.5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppTheme.goldPrimary : AppTheme.textMuted.withOpacity(0.3),
            width: isSelected ? 3 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppTheme.goldPrimary.withOpacity(0.3),
                    blurRadius: 15,
                    spreadRadius: 2,
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: isFullWidth ? 40 : 48,
              color: isSelected ? AppTheme.goldPrimary : AppTheme.textSecondary,
            ),
            const SizedBox(height: 12),
            Text(
              provider.getGenderDisplayName(gender),
              style: GoogleFonts.lato(
                fontSize: 16,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? AppTheme.goldPrimary : AppTheme.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: Duration(milliseconds: delay), duration: 400.ms);
  }
}
