import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../providers/onboarding_provider.dart';
import '../../../../core/theme/app_theme.dart';

class BirthDateStep extends StatefulWidget {
  const BirthDateStep({super.key});

  @override
  State<BirthDateStep> createState() => _BirthDateStepState();
}

class _BirthDateStepState extends State<BirthDateStep> {
  int? selectedDay;
  int? selectedMonth;
  int? selectedYear;

  final List<int> days = List.generate(31, (index) => index + 1);
  final List<int> months = List.generate(12, (index) => index + 1);
  final List<int> years = List.generate(100, (index) => DateTime.now().year - index);

  @override
  void initState() {
    super.initState();
    final provider = context.read<OnboardingProvider>();
    if (provider.birthDate != null) {
      selectedDay = provider.birthDate!.day;
      selectedMonth = provider.birthDate!.month;
      selectedYear = provider.birthDate!.year;
    }
  }

  void _updateBirthDate() {
    if (selectedDay != null && selectedMonth != null && selectedYear != null) {
      final date = DateTime(selectedYear!, selectedMonth!, selectedDay!);
      context.read<OnboardingProvider>().setBirthDate(date);
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
            Icons.calendar_today_outlined,
            size: 64,
            color: AppTheme.goldPrimary.withOpacity(0.8),
          ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack),
          
          const SizedBox(height: 24),
          
          // Title
          Text(
            'Yıldızların konumunu hesaplamak için...',
            style: GoogleFonts.cinzel(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppTheme.goldPrimary,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(duration: 600.ms).slideY(begin: -0.2, end: 0),
          
          const SizedBox(height: 8),
          
          // Question
          Text(
            'Ne zaman doğdun?',
            style: GoogleFonts.lato(
              fontSize: 18,
              color: AppTheme.textSecondary,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(delay: 200.ms, duration: 600.ms),
          
          const SizedBox(height: 40),
          
          // Date Pickers
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
              children: [
                // Day
                Expanded(
                  child: _buildDatePicker(
                    label: 'Gün',
                    value: selectedDay,
                    items: days,
                    onChanged: (value) {
                      setState(() {
                        selectedDay = value;
                      });
                      _updateBirthDate();
                    },
                  ),
                ),
                
                const SizedBox(width: 12),
                
                // Month
                Expanded(
                  child: _buildDatePicker(
                    label: 'Ay',
                    value: selectedMonth,
                    items: months,
                    onChanged: (value) {
                      setState(() {
                        selectedMonth = value;
                      });
                      _updateBirthDate();
                    },
                  ),
                ),
                
                const SizedBox(width: 12),
                
                // Year
                Expanded(
                  child: _buildDatePicker(
                    label: 'Yıl',
                    value: selectedYear,
                    items: years,
                    onChanged: (value) {
                      setState(() {
                        selectedYear = value;
                      });
                      _updateBirthDate();
                    },
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 400.ms, duration: 600.ms),
          
          const SizedBox(height: 32),
          
          // Selected Date Display
          if (provider.birthDate != null)
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
                    provider.getBirthDateString(),
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
          
          // Zodiac Info
          if (provider.birthDate != null)
            Text(
              _getZodiacSign(provider.birthDate!),
              style: GoogleFonts.lato(
                fontSize: 16,
                color: AppTheme.purpleLight,
                fontStyle: FontStyle.italic,
              ),
              textAlign: TextAlign.center,
            ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
        ],
      ),
    );
  }

  Widget _buildDatePicker({
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
                  '-',
                  style: GoogleFonts.lato(
                    color: AppTheme.textMuted,
                    fontSize: 18,
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
                        fontSize: 20,
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

  String _getZodiacSign(DateTime date) {
    final day = date.day;
    final month = date.month;

    String sign;
    if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) {
      sign = 'Koç';
    } else if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) {
      sign = 'Boğa';
    } else if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) {
      sign = 'İkizler';
    } else if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) {
      sign = 'Yengeç';
    } else if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) {
      sign = 'Aslan';
    } else if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) {
      sign = 'Başak';
    } else if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) {
      sign = 'Terazi';
    } else if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) {
      sign = 'Akrep';
    } else if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) {
      sign = 'Yay';
    } else if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) {
      sign = 'Oğlak';
    } else if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) {
      sign = 'Kova';
    } else {
      sign = 'Balık';
    }

    return 'Burcunuz: $sign ♈';
  }
}
