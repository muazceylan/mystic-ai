import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../data/models/auth_models.dart';
import '../../providers/onboarding_provider.dart';
import '../../../core/theme/app_theme.dart';
import 'steps/email_registration_step.dart';
import 'steps/birth_date_step.dart';
import 'steps/birth_time_step.dart';
import 'steps/birth_location_step.dart';
import 'steps/gender_step.dart';
import 'steps/marital_status_step.dart';
import 'steps/focus_point_step.dart';

class OnboardingPage extends StatelessWidget {
  const OnboardingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => OnboardingProvider(),
      child: const _OnboardingPageContent(),
    );
  }
}

class _OnboardingPageContent extends StatelessWidget {
  const _OnboardingPageContent();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OnboardingProvider>();

    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Progress Header
            _buildProgressHeader(context, provider),
            
            // Page View
            Expanded(
              child: PageView(
                controller: provider.pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (index) {
                  // Prevent manual swiping
                },
                children: const [
                  EmailRegistrationStep(),
                  BirthDateStep(),
                  BirthTimeStep(),
                  BirthLocationStep(),
                  GenderStep(),
                  MaritalStatusStep(),
                  FocusPointStep(),
                ],
              ),
            ),
            
            // Bottom Navigation
            _buildBottomNavigation(context, provider),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressHeader(BuildContext context, OnboardingProvider provider) {
    final stepTitles = [
      'Kayıt',
      'Doğum Tarihi',
      'Doğum Saati',
      'Doğum Yeri',
      'Cinsiyet',
      'İlişki Durumu',
      'Odak Noktası',
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
        color: AppTheme.darkSurface.withOpacity(0.5),
        border: Border(
          bottom: BorderSide(
            color: AppTheme.goldPrimary.withOpacity(0.2),
            width: 1,
          ),
        ),
      ),
      child: Column(
        children: [
          // Step Title
          Text(
            stepTitles[provider.currentStep],
            style: GoogleFonts.cinzel(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppTheme.goldPrimary,
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Progress Bar
          Row(
            children: List.generate(7, (index) {
              final isActive = index <= provider.currentStep;
              final isCurrent = index == provider.currentStep;
              
              return Expanded(
                child: Container(
                  height: 4,
                  margin: EdgeInsets.only(
                    right: index < 6 ? 4 : 0,
                  ),
                  decoration: BoxDecoration(
                    color: isActive
                        ? isCurrent
                            ? AppTheme.goldPrimary
                            : AppTheme.goldPrimary.withOpacity(0.6)
                        : AppTheme.textMuted.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              );
            }),
          ),
          
          const SizedBox(height: 8),
          
          // Step Counter
          Text(
            'Adım ${provider.currentStep + 1} / 7',
            style: GoogleFonts.lato(
              fontSize: 12,
              color: AppTheme.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNavigation(BuildContext context, OnboardingProvider provider) {
    final isLastStep = provider.currentStep == 6;
    final canProceed = provider.isCurrentStepValid;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.darkSurface.withOpacity(0.5),
        border: Border(
          top: BorderSide(
            color: AppTheme.goldPrimary.withOpacity(0.2),
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Back Button
            if (provider.currentStep > 0)
              Expanded(
                flex: 1,
                child: OutlinedButton.icon(
                  onPressed: provider.previousStep,
                  icon: const Icon(Icons.arrow_back),
                  label: Text(
                    'Geri',
                    style: GoogleFonts.cinzel(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.textSecondary,
                    side: BorderSide(
                      color: AppTheme.textMuted.withOpacity(0.5),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              )
            else
              const Expanded(flex: 1, child: SizedBox()),
            
            const SizedBox(width: 16),
            
            // Next/Complete Button
            Expanded(
              flex: 2,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                child: ElevatedButton(
                  onPressed: canProceed
                      ? () {
                          if (isLastStep) {
                            _completeRegistration(context, provider);
                          } else {
                            provider.nextStep();
                          }
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.goldPrimary,
                    foregroundColor: AppTheme.darkBackground,
                    disabledBackgroundColor: AppTheme.textMuted.withOpacity(0.3),
                    disabledForegroundColor: AppTheme.textMuted,
                    elevation: canProceed ? 4 : 0,
                    shadowColor: AppTheme.goldPrimary.withOpacity(0.4),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: provider.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              AppTheme.darkBackground,
                            ),
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              isLastStep ? 'Tamamla' : 'Devam Et',
                              style: GoogleFonts.cinzel(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            if (!isLastStep) ...[
                              const SizedBox(width: 8),
                              const Icon(Icons.arrow_forward, size: 18),
                            ],
                          ],
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _completeRegistration(BuildContext context, OnboardingProvider provider) async {
    provider.setLoading(true);
    provider.setError(null);

    try {
      // Build the register request
      final request = provider.buildRegisterRequest();
      
      // TODO: Call AuthService.register()
      // await authService.register(request);
      
      // Simulate API call
      await Future.delayed(const Duration(seconds: 2));
      
      // Show success message
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Kayıt başarılı! Hoş geldiniz, ${request.firstName}!',
              style: GoogleFonts.lato(),
            ),
            backgroundColor: AppTheme.success,
          ),
        );
        
        // Navigate to home page
        // Navigator.of(context).pushReplacementNamed('/home');
      }
    } catch (e) {
      provider.setError(e.toString());
      
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Kayıt başarısız: ${e.toString()}',
              style: GoogleFonts.lato(),
            ),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    } finally {
      provider.setLoading(false);
    }
  }
}
