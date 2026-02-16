import 'package:flutter/material.dart';
import '../../data/models/auth_models.dart';

enum Gender { female, male, unspecified }

enum MaritalStatus { single, inRelationship, engaged, married, complicated }

enum FocusPoint { money, love, career, family, travel, spiritual }

class OnboardingProvider extends ChangeNotifier {
  // Page Controller
  final PageController pageController = PageController();
  int _currentStep = 0;
  int get currentStep => _currentStep;

  // Step 1: Email Registration
  String _firstName = '';
  String _lastName = '';
  String _email = '';
  String _password = '';
  bool _isSocialLogin = false;

  // Step 2: Birth Date
  DateTime? _birthDate;

  // Step 3: Birth Time
  TimeOfDay? _birthTime;
  bool _unknownBirthTime = false;

  // Step 4: Birth Location
  String _birthLocation = '';

  // Step 5: Gender
  Gender? _selectedGender;

  // Step 6: Marital Status
  MaritalStatus? _selectedMaritalStatus;

  // Step 7: Focus Point
  FocusPoint? _selectedFocusPoint;

  // Loading State
  bool _isLoading = false;
  String? _errorMessage;

  // Getters
  String get firstName => _firstName;
  String get lastName => _lastName;
  String get email => _email;
  String get password => _password;
  bool get isSocialLogin => _isSocialLogin;
  DateTime? get birthDate => _birthDate;
  TimeOfDay? get birthTime => _birthTime;
  bool get unknownBirthTime => _unknownBirthTime;
  String get birthLocation => _birthLocation;
  Gender? get selectedGender => _selectedGender;
  MaritalStatus? get selectedMaritalStatus => _selectedMaritalStatus;
  FocusPoint? get selectedFocusPoint => _selectedFocusPoint;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // Validation Getters
  bool get isStep1Valid => 
      _firstName.isNotEmpty && 
      _lastName.isNotEmpty && 
      _email.isNotEmpty && 
      _password.isNotEmpty;

  bool get isStep2Valid => _birthDate != null;

  bool get isStep3Valid => _unknownBirthTime || _birthTime != null;

  bool get isStep4Valid => _birthLocation.isNotEmpty;

  bool get isStep5Valid => _selectedGender != null;

  bool get isStep6Valid => _selectedMaritalStatus != null;

  bool get isStep7Valid => _selectedFocusPoint != null;

  bool get isCurrentStepValid {
    switch (_currentStep) {
      case 0:
        return isStep1Valid;
      case 1:
        return isStep2Valid;
      case 2:
        return isStep3Valid;
      case 3:
        return isStep4Valid;
      case 4:
        return isStep5Valid;
      case 5:
        return isStep6Valid;
      case 6:
        return isStep7Valid;
      default:
        return false;
    }
  }

  // Setters
  void setFirstName(String value) {
    _firstName = value;
    notifyListeners();
  }

  void setLastName(String value) {
    _lastName = value;
    notifyListeners();
  }

  void setEmail(String value) {
    _email = value;
    notifyListeners();
  }

  void setPassword(String value) {
    _password = value;
    notifyListeners();
  }

  void setSocialLogin(bool value) {
    _isSocialLogin = value;
    notifyListeners();
  }

  void setSocialUserData({
    required String firstName,
    required String lastName,
    required String email,
  }) {
    _firstName = firstName;
    _lastName = lastName;
    _email = email;
    _isSocialLogin = true;
    notifyListeners();
  }

  void setBirthDate(DateTime value) {
    _birthDate = value;
    notifyListeners();
  }

  void setBirthTime(TimeOfDay value) {
    _birthTime = value;
    notifyListeners();
  }

  void setUnknownBirthTime(bool value) {
    _unknownBirthTime = value;
    if (value) {
      _birthTime = const TimeOfDay(hour: 12, minute: 0);
    } else {
      _birthTime = null;
    }
    notifyListeners();
  }

  void setBirthLocation(String value) {
    _birthLocation = value;
    notifyListeners();
  }

  void setGender(Gender value) {
    _selectedGender = value;
    notifyListeners();
  }

  void setMaritalStatus(MaritalStatus value) {
    _selectedMaritalStatus = value;
    notifyListeners();
  }

  void setFocusPoint(FocusPoint value) {
    _selectedFocusPoint = value;
    notifyListeners();
  }

  void setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  void setError(String? value) {
    _errorMessage = value;
    notifyListeners();
  }

  // Navigation
  void nextStep() {
    if (_currentStep < 6 && isCurrentStepValid) {
      _currentStep++;
      pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOutCubic,
      );
      notifyListeners();
    }
  }

  void previousStep() {
    if (_currentStep > 0) {
      _currentStep--;
      pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOutCubic,
      );
      notifyListeners();
    }
  }

  void goToStep(int step) {
    if (step >= 0 && step <= 6) {
      _currentStep = step;
      pageController.animateToPage(
        step,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOutCubic,
      );
      notifyListeners();
    }
  }

  // Helper Methods
  String getGenderDisplayName(Gender gender) {
    switch (gender) {
      case Gender.female:
        return 'Kadın';
      case Gender.male:
        return 'Erkek';
      case Gender.unspecified:
        return 'Belirtmek İstemiyorum';
    }
  }

  String getMaritalStatusDisplayName(MaritalStatus status) {
    switch (status) {
      case MaritalStatus.single:
        return 'Bekar';
      case MaritalStatus.inRelationship:
        return 'İlişkisi Var';
      case MaritalStatus.engaged:
        return 'Nişanlı';
      case MaritalStatus.married:
        return 'Evli';
      case MaritalStatus.complicated:
        return 'Karmaşık';
    }
  }

  String getFocusPointDisplayName(FocusPoint point) {
    switch (point) {
      case FocusPoint.money:
        return 'Para & Finans';
      case FocusPoint.love:
        return 'Aşk & İlişkiler';
      case FocusPoint.career:
        return 'Kariyer & İş';
      case FocusPoint.family:
        return 'Aile & Ev';
      case FocusPoint.travel:
        return 'Seyahat & Keşif';
      case FocusPoint.spiritual:
        return 'Ruhsal Gelişim';
    }
  }

  String getFocusPointEmoji(FocusPoint point) {
    switch (point) {
      case FocusPoint.money:
        return '💰';
      case FocusPoint.love:
        return '❤️';
      case FocusPoint.career:
        return '💼';
      case FocusPoint.family:
        return '🏡';
      case FocusPoint.travel:
        return '✈️';
      case FocusPoint.spiritual:
        return '🔮';
    }
  }

  String? getGenderString() {
    if (_selectedGender == null) return null;
    switch (_selectedGender!) {
      case Gender.female:
        return 'FEMALE';
      case Gender.male:
        return 'MALE';
      case Gender.unspecified:
        return 'UNSPECIFIED';
    }
  }

  String? getMaritalStatusString() {
    if (_selectedMaritalStatus == null) return null;
    switch (_selectedMaritalStatus!) {
      case MaritalStatus.single:
        return 'SINGLE';
      case MaritalStatus.inRelationship:
        return 'IN_RELATIONSHIP';
      case MaritalStatus.engaged:
        return 'ENGAGED';
      case MaritalStatus.married:
        return 'MARRIED';
      case MaritalStatus.complicated:
        return 'COMPLICATED';
    }
  }

  String? getFocusPointString() {
    if (_selectedFocusPoint == null) return null;
    switch (_selectedFocusPoint!) {
      case FocusPoint.money:
        return 'MONEY';
      case FocusPoint.love:
        return 'LOVE';
      case FocusPoint.career:
        return 'CAREER';
      case FocusPoint.family:
        return 'FAMILY';
      case FocusPoint.travel:
        return 'TRAVEL';
      case FocusPoint.spiritual:
        return 'SPIRITUAL';
    }
  }

  String getBirthTimeString() {
    if (_unknownBirthTime || _birthTime == null) {
      return '12:00';
    }
    final hour = _birthTime!.hour.toString().padLeft(2, '0');
    final minute = _birthTime!.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  String getBirthDateString() {
    if (_birthDate == null) return '';
    final day = _birthDate!.day.toString().padLeft(2, '0');
    final month = _birthDate!.month.toString().padLeft(2, '0');
    final year = _birthDate!.year.toString();
    return '$day/$month/$year';
  }

  // Build RegisterRequest
  RegisterRequest buildRegisterRequest() {
    return RegisterRequest(
      username: _email.split('@').first,
      email: _email,
      password: _password,
      firstName: _firstName,
      lastName: _lastName,
      birthDate: getBirthDateString(),
      birthTime: getBirthTimeString(),
      birthLocation: _birthLocation,
      gender: getGenderString(),
      maritalStatus: getMaritalStatusString(),
      focusPoint: getFocusPointString(),
    );
  }

  // Reset
  void reset() {
    _currentStep = 0;
    _firstName = '';
    _lastName = '';
    _email = '';
    _password = '';
    _isSocialLogin = false;
    _birthDate = null;
    _birthTime = null;
    _unknownBirthTime = false;
    _birthLocation = '';
    _selectedGender = null;
    _selectedMaritalStatus = null;
    _selectedFocusPoint = null;
    _isLoading = false;
    _errorMessage = null;
    pageController.jumpToPage(0);
    notifyListeners();
  }

  @override
  void dispose() {
    pageController.dispose();
    super.dispose();
  }
}
