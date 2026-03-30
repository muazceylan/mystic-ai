interface TutorialStepEnglishCopy {
  title: string;
  body: string;
}

interface TutorialEnglishCopy {
  steps: Record<string, TutorialStepEnglishCopy>;
}

export const LOCAL_TUTORIAL_ENGLISH_COPY: Record<string, TutorialEnglishCopy> = {
  global_onboarding_v1: {
    steps: {
      welcome: {
        title: 'Welcome',
        body: 'Welcome to your personalized astrology, planning, and insight experience.',
      },
      'daily-guidance': {
        title: 'Daily Guidance',
        body: "Track today's energy, transits, and standout influences here.",
      },
      'planning-and-decisions': {
        title: 'Planning and Decisions',
        body: 'Use Cosmic Planner and Decision Compass to review timing and options with more clarity.',
      },
      'compatibility-and-discovery': {
        title: 'Compatibility and Discovery',
        body: 'Explore compatibility, dreams, numerology, and other modules to know yourself more deeply.',
      },
      'lets-start': {
        title: "Let's Begin",
        body: 'As you open modules, short guides will help you get started.',
      },
    },
  },
  home_foundation_tutorial: {
    steps: {
      'hero-energy': {
        title: "Today's Energy",
        body: "See today's energy here in a short and simple format.",
      },
      'quick-actions': {
        title: 'Core Module Shortcuts',
        body: 'Jump quickly to the modules you use most from here.',
      },
      'personal-widget': {
        title: 'Personalized Suggestions',
        body: 'Your personalized insights and recommendations stand out here.',
      },
      'module-guides': {
        title: 'More Guides',
        body: 'You will see the rest of the guides as you enter each module.',
      },
    },
  },
  daily_transits_foundation_tutorial: {
    steps: {
      'daily-summary': {
        title: "Today's Summary",
        body: "See today's sky influences here in a short and easy-to-read format.",
      },
      'transit-cards': {
        title: 'Transit Cards',
        body: "Transit cards explain the day's standout influences one by one.",
      },
      'impact-zones': {
        title: 'Impact Zones',
        body: 'Supportive areas and caution zones help you interpret decisions more consciously.',
      },
      'help-reopen': {
        title: 'Open the Guide Again',
        body: 'You can restart this guide here whenever you need it.',
      },
    },
  },
  cosmic_planner_intro: {
    steps: {
      'date-selection': {
        title: 'Date Selection',
        body: 'See which day is better suited for the topic you want to focus on.',
      },
      'category-dock': {
        title: 'Category Dock',
        body: 'Choose a category to focus on areas like love, work, or communication.',
      },
      'daily-recommendations': {
        title: 'Daily Recommendations',
        body: 'Daily suggestions are designed to help you shape plans around the sky rhythm.',
      },
      'reminder-action': {
        title: 'Reminder and Plan',
        body: 'Use reminders to follow your plan without missing the right timing.',
      },
    },
  },
  decision_compass_intro: {
    steps: {
      'decision-input': {
        title: 'Decision Input Area',
        body: "Compare your options here while considering the day's influences.",
      },
      'result-comparison': {
        title: 'Result Comparison',
        body: 'The result area does not give a rigid verdict; it offers supportive guidance for your choice.',
      },
      'insight-commentary': {
        title: 'Insight Commentary',
        body: 'These notes help you see the strengths and weak points of each option more clearly.',
      },
      'reevaluate-entry': {
        title: 'Re-evaluate',
        body: 'Save your result to revisit it later or adjust your options when needed.',
      },
    },
  },
  compatibility_foundation_tutorial: {
    steps: {
      'compatibility-summary': {
        title: 'Compatibility Summary',
        body: 'See the overall compatibility snapshot here at a glance.',
      },
      'sections-and-details': {
        title: 'Sections and Details',
        body: 'Review personal and relationship areas together for a clearer interpretation.',
      },
      'category-score-cards': {
        title: 'Category Cards',
        body: 'Alongside the scores, you also get explanations and suggestions instead of numbers alone.',
      },
      'save-and-share': {
        title: 'Save and Share',
        body: 'Save the analysis to revisit it later or share the result when you want.',
      },
    },
  },
  birth_chart_intro: {
    steps: {
      'hero-summary': {
        title: 'Chart Summary',
        body: 'See the main summary of your birth chart here at a glance.',
      },
      'main-placements': {
        title: 'Main Placements',
        body: 'Main placements help you understand your character and natural tendencies.',
      },
      'technical-details': {
        title: 'Technical Details',
        body: 'Dive into houses, signs, and technical layers from the detail area.',
      },
      'insight-cards': {
        title: 'Insight Cards',
        body: 'Insight cards make the information in your chart clearer and easier to absorb.',
      },
      'detail-actions': {
        title: 'Save and Explore',
        body: 'Save this area, share it, or continue with a deeper review whenever you want.',
      },
    },
  },
  dreams_foundation_tutorial: {
    steps: {
      'dream-entry': {
        title: 'Dream Entry',
        body: 'Write your dream to receive a symbolic interpretation.',
      },
      'interpretation-result': {
        title: 'Interpretation Result',
        body: 'The interpretation is designed to support awareness and insight.',
      },
      'history-entry': {
        title: 'Past Records',
        body: 'Return to previous dream entries and follow your evolving patterns over time.',
      },
      'help-entry': {
        title: 'Open the Guide Again',
        body: 'Restart this guide from the same screen whenever you need it.',
      },
    },
  },
  numerology_foundation_tutorial: {
    steps: {
      'numerology-input': {
        title: 'Input Area',
        body: 'Discover the symbolic meanings of your numbers here.',
      },
      'numerology-result': {
        title: 'Result Card',
        body: 'Your core number profile and current theme stand out here in a short summary.',
      },
      'numerology-detail': {
        title: 'Detailed Explanations',
        body: 'Detail cards explain your personal numbers in a deeper and clearer way.',
      },
      'help-entry': {
        title: 'Open the Guide Again',
        body: 'Restart this guide manually whenever you want.',
      },
    },
  },
  name_analysis_foundation_tutorial: {
    steps: {
      'name-input': {
        title: 'Name Input Area',
        body: 'Enter a name to start exploring its meaning and symbolic associations.',
      },
      'meaning-panel': {
        title: 'Meaning and Origin',
        body: 'See the meaning of the name and its symbolic associations here.',
      },
      'save-share': {
        title: 'Save and Favorite',
        body: 'Save the names you like and come back to them quickly later.',
      },
      'help-entry': {
        title: 'Open the Guide Again',
        body: 'You can reopen this guide whenever you need it from the same screen.',
      },
    },
  },
  spiritual_practice_foundation_tutorial: {
    steps: {
      'daily-recommendation': {
        title: 'Daily Recommendation',
        body: "See today's recommended practice here and begin with a quick entry point.",
      },
      'practice-counter': {
        title: 'Practice Counter',
        body: 'Use the counter area to follow your daily practice step by step.',
      },
      'journal-entry': {
        title: 'Journal and Records',
        body: 'Save short notes about your experience and follow your growth more consistently.',
      },
      'help-entry': {
        title: 'Open the Guide Again',
        body: 'Reopen this guide from the same screen whenever you want.',
      },
    },
  },
  profile_foundation_tutorial: {
    steps: {
      'personal-info': {
        title: 'Personal Information',
        body: 'Update your profile details here to make the experience feel more personal.',
      },
      preferences: {
        title: 'Preferences',
        body: 'Manage notification, language, and experience preferences from this section.',
      },
      'tutorial-center': {
        title: 'Tutorial Center',
        body: 'See all onboarding and tutorial flows in one place and restart them whenever needed.',
      },
      'help-entry': {
        title: 'Help and Guidance',
        body: 'Use the help area whenever you want to review tutorials again.',
      },
    },
  },
};
