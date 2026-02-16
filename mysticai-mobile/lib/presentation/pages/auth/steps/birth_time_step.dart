import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../providers/onboarding_provider.dart';
import '../../../../core/theme/app_theme.dart';

class BirthTimeStep extends StatefulWidget {
  const BirthTimeStep({super.key});

  @override
  State<BirthTimeStep> createState() => _BirthTimeStepState();
}

class _BirthTimeStepState extends State<BirthTimeStep> {
  int? selectedHour;
  int? selectedMinute;

  final List<int> hours = List.generate(24, (index) => index);
  final List<int> minutes = List.generate(60, (index) => index);

  @override
  void initState() {
    super.initState();
    final provider = context.read<OnboardingProvider>();
    if (provider.birthTime != null) {
      selectedHour = provider.birthTime!.hour;
      selectedMinute = provider.birthTime!.minute;
    }
  }

  void _updateBirthTime() {
    if (selectedHour != null && selectedMinute != null) {
      final time = TimeOfDay(hour: selectedHour!, minute: selectedMinute!);
      context.read<OnboardingProvider>().setBirthTime(time);
    }
  }

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
            Icons.access_time_outlined,
            size: 64,
            color: AppTheme.goldPrimary.withOpacity(0.8),
          ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack),
          
          const SizedBox(height: 24),
          
          // Title
          Text(
            'Doğum Saatiniz',
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
            'Daha hassas bir astroloji haritası için saatinizi bilmek önemli',
            style: GoogleFonts.lato(
              fontSize: 16,
              color: AppTheme.textSecondary,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(delay: 200.ms, duration: 600.ms),
          
          const SizedBox(height: 40),
          
          // Time Pickers (only show if not unknown)
          if (!provider.unknownBirthTime)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.darkCard.withOpacity(0.5),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: AppTheme.goldPrimary.withOpacity(0.2),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Hour
                  _buildTimePicker(
                    label: 'Saat',
                    value: selectedHour,
                    items: hours,
                    onChanged: (value) {
                      setState(() {
                        selectedHour = value;
                      });
                      _updateBirthTime();
                    },
                  ),
                  
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      ':',
                      style: GoogleFonts.cinzel(
                        fontSize: 36,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.goldPrimary,
                      ),
                    ),
                  ),
                  
                  // Minute
                  _buildTimePicker(
                    label: 'Dakika',
                    value: selectedMinute,
                    items: minutes,
                    onChanged: (value) {
                      setState(() {
                        selectedMinute = value;
                      });
                      _updateBirthTime();
                    },
                  ),
                ],
              ),
            ).animate().fadeIn(delay: 400.ms, duration: 600.ms),
          
          const SizedBox(height: 32),
          
          // Unknown Birth Time Checkbox
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: provider.unknownBirthTime
                  ? AppTheme.purplePrimary.withOpacity(0.1)
                  : AppTheme.darkSurface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: provider.unknownBirthTime
                    ? AppTheme.purplePrimary
                    : AppTheme.textMuted.withOpacity(0.3),
                width: provider.unknownBirthTime ? 2 : 1,
              ),
            ),
            child: InkWell(
              onTap: () {
                provider.setUnknownBirthTime(!provider.unknownBirthTime);
              },
              borderRadius: BorderRadius.circular(12),
              child: Row(
                children: [
                  Checkbox(
                    value: provider.unknownBirthTime,
                    onChanged: (value) {
                      provider.setUnknownBirthTime(value ?? false);
                    },
                    activeColor: AppTheme.purplePrimary,
                    checkColor: AppTheme.textPrimary,
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Doğum saatimi bilmiyorum',
                          style: GoogleFonts.lato(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: provider.unknownBirthTime
                                ? AppTheme.purpleLight
                                : AppTheme.textPrimary,
                          ),
                        ),
                        Text(
                          'Otomatik olarak 12:00 kullanılacak',
                          style: GoogleFonts.lato(
                            fontSize: 12,
                            color: AppTheme.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ).animate().fadeIn(delay: 600.ms, duration: 400.ms),
          
          const SizedBox(height: 32),
          
          // Selected Time Display
          if (provider.birthTime != null)
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
                    provider.getBirthTimeString(),
                    style: GoogleFonts.cinzel(
                      fontSize: 24,
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

  Widget _buildTimePicker({
    required String label,
    required int? value,
    required List<int> items,
    required ValueChanged<int?> onChanged,
  }) {
    return Column(
      children: [
        Text(
          label,
          style: GoogleFonts.lato(
            fontSize: 14,
            color: AppTheme.textMuted,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          width: 80,
          decoration: BoxDecoration(
            color: AppTheme.darkSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: value != null
                  ? AppTheme.goldPrimary
                  : AppTheme.textMuted.withOpacity(0.3),
              width: value != null ? 2 : 1,
            ),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<int>(
              value: value,
              isExpanded: true,
              hint: Center(
                child: Text(
                  '--',
                  style: GoogleFonts.lato(
                    color: AppTheme.textMuted,
                    fontSize: 20,
                  ),
                ),
              ),
              icon: const SizedBox.shrink(),
              dropdownColor: AppTheme.darkCard,
              borderRadius: BorderRadius.circular(12),
              items: items.map((item) {
                return DropdownMenuItem<int>(
                  value: item,
                  child: Center(
                    child: Text(
                      item.toString().padLeft(2, '0'),
                      style: GoogleFonts.lato(
                        color: AppTheme.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                );
              }).toList(),
              onChanged: onChanged,
              selectedItemBuilder: (context) {
                return items.map((item) {
                  return Center(
                    child: Text(
                      item.toString().padLeft(2, '0'),
                      style: GoogleFonts.lato(
                        color: AppTheme.goldPrimary,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  );
                }).toList();
              },
            ),
          ),
        ),
      ],
    );
  }
}
