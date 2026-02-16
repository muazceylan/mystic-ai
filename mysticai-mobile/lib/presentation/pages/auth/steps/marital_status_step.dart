import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../providers/onboarding_provider.dart';
import '../../../../core/theme/app_theme.dart';

class MaritalStatusStep extends StatelessWidget {
  const MaritalStatusStep({super.key});

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
            Icons.favorite_border,
            size: 64,
            color: AppTheme.goldPrimary.withOpacity(0.8),
          ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack),
          
          const SizedBox(height: 24),
          
          // Title
          Text(
            'Kalbinin Durumu Nedir?',
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
            'İlişki durumunuz, yıldız yorumlarınızı kişiselleştirmemize yardımcı olur',
            style: GoogleFonts.lato(
              fontSize: 16,
              color: AppTheme.textSecondary,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(delay: 200.ms, duration: 600.ms),
          
          const SizedBox(height: 40),
          
          // Marital Status Options
          _buildStatusCard(
            context: context,
            status: MaritalStatus.single,
            icon: Icons.person_outline,
            delay: 0,
          ),
          
          const SizedBox(height: 12),
          
          _buildStatusCard(
            context: context,
            status: MaritalStatus.inRelationship,
            icon: Icons.favorite,
            delay: 100,
          ),
          
          const SizedBox(height: 12),
          
          _buildStatusCard(
            context: context,
            status: MaritalStatus.engaged,
            icon: Icons.diamond_outlined,
            delay: 200,
          ),
          
          const SizedBox(height: 12),
          
          _buildStatusCard(
            context: context,
            status: MaritalStatus.married,
            icon: Icons.favorite_border,
            delay: 300,
          ),
          
          const SizedBox(height: 12),
          
          _buildStatusCard(
            context: context,
            status: MaritalStatus.complicated,
            icon: Icons.help_outline,
            delay: 400,
          ),
          
          const SizedBox(height: 32),
          
          // Selected Status Display
          if (provider.selectedMaritalStatus != null)
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
                    provider.getMaritalStatusDisplayName(provider.selectedMaritalStatus!),
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

  Widget _buildStatusCard({
    required BuildContext context,
    required MaritalStatus status,
    required IconData icon,
    required int delay,
  }) {
    final provider = context.watch<OnboardingProvider>();
    final isSelected = provider.selectedMaritalStatus == status;

    return GestureDetector(
      onTap: () {
        provider.setMaritalStatus(status);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.goldPrimary.withOpacity(0.1)
              : AppTheme.darkCard.withOpacity(0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.goldPrimary : AppTheme.textMuted.withOpacity(0.3),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppTheme.goldPrimary.withOpacity(0.2),
                    blurRadius: 10,
                    spreadRadius: 1,
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppTheme.goldPrimary.withOpacity(0.2)
                    : AppTheme.darkSurface,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                size: 24,
                color: isSelected ? AppTheme.goldPrimary : AppTheme.textSecondary,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                provider.getMaritalStatusDisplayName(status),
                style: GoogleFonts.lato(
                  fontSize: 16,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? AppTheme.goldPrimary : AppTheme.textPrimary,
                ),
              ),
            ),
            if (isSelected)
              const Icon(
                Icons.check_circle,
                color: AppTheme.goldPrimary,
              ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: Duration(milliseconds: delay), duration: 400.ms);
  }
}
