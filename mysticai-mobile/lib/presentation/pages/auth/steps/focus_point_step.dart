import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../providers/onboarding_provider.dart';
import '../../../../core/theme/app_theme.dart';

class FocusPointStep extends StatelessWidget {
  const FocusPointStep({super.key});

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
            Icons.auto_fix_high_outlined,
            size: 64,
            color: AppTheme.goldPrimary.withOpacity(0.8),
          ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack),
          
          const SizedBox(height: 24),
          
          // Title
          Text(
            'Neye Odaklanıyorsunuz?',
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
            'Hayatınızda şu an en çok önem verdiğiniz alanı seçin',
            style: GoogleFonts.lato(
              fontSize: 16,
              color: AppTheme.textSecondary,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(delay: 200.ms, duration: 600.ms),
          
          const SizedBox(height: 40),
          
          // Focus Point Grid
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.2,
            children: [
              _buildFocusCard(
                context: context,
                point: FocusPoint.money,
                delay: 0,
              ),
              _buildFocusCard(
                context: context,
                point: FocusPoint.love,
                delay: 100,
              ),
              _buildFocusCard(
                context: context,
                point: FocusPoint.career,
                delay: 200,
              ),
              _buildFocusCard(
                context: context,
                point: FocusPoint.family,
                delay: 300,
              ),
              _buildFocusCard(
                context: context,
                point: FocusPoint.travel,
                delay: 400,
              ),
              _buildFocusCard(
                context: context,
                point: FocusPoint.spiritual,
                delay: 500,
              ),
            ],
          ),
          
          const SizedBox(height: 32),
          
          // Selected Focus Display
          if (provider.selectedFocusPoint != null)
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
                    '${provider.getFocusPointEmoji(provider.selectedFocusPoint!)} ${provider.getFocusPointDisplayName(provider.selectedFocusPoint!)}',
                    style: GoogleFonts.cinzel(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.darkBackground,
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms).scale(),
          
          const SizedBox(height: 24),
          
          // Info Text
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.purplePrimary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.purplePrimary.withOpacity(0.3),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.lightbulb_outline,
                  color: AppTheme.purpleLight,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Bu seçim, size özel yıldız yorumlarınızı şekillendirecek.',
                    style: GoogleFonts.lato(
                      fontSize: 13,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 600.ms, duration: 400.ms),
        ],
      ),
    );
  }

  Widget _buildFocusCard({
    required BuildContext context,
    required FocusPoint point,
    required int delay,
  }) {
    final provider = context.watch<OnboardingProvider>();
    final isSelected = provider.selectedFocusPoint == point;

    return GestureDetector(
      onTap: () {
        provider.setFocusPoint(point);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.goldPrimary.withOpacity(0.15)
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
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              provider.getFocusPointEmoji(point),
              style: const TextStyle(fontSize: 36),
            ),
            const SizedBox(height: 8),
            Text(
              provider.getFocusPointDisplayName(point),
              style: GoogleFonts.lato(
                fontSize: 14,
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
