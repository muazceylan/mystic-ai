type MonetizationEnvironmentRules = Record<string, unknown> & {
  platforms?: Record<string, unknown> & {
    web?: Record<string, unknown> & {
      adsEnabled?: boolean;
    };
  };
  web?: Record<string, unknown> & {
    adsEnabled?: boolean;
  };
  webAdsEnabled?: boolean;
};

function parseEnvironmentRules(environmentRulesJson?: string): MonetizationEnvironmentRules {
  if (!environmentRulesJson?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(environmentRulesJson) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as MonetizationEnvironmentRules;
    }
  } catch {
    // Invalid JSON should not break the form.
  }

  return {};
}

export function getWebAdsEnabled(environmentRulesJson?: string): boolean {
  const rules = parseEnvironmentRules(environmentRulesJson);

  if (typeof rules.webAdsEnabled === 'boolean') {
    return rules.webAdsEnabled;
  }

  const nestedPlatformValue = rules.platforms?.web?.adsEnabled;
  if (typeof nestedPlatformValue === 'boolean') {
    return nestedPlatformValue;
  }

  const legacyValue = rules.web?.adsEnabled;
  if (typeof legacyValue === 'boolean') {
    return legacyValue;
  }

  return true;
}

export function mergeWebAdsEnabled(environmentRulesJson: string | undefined, enabled: boolean): string {
  const rules = parseEnvironmentRules(environmentRulesJson);
  const platforms = rules.platforms && typeof rules.platforms === 'object' ? rules.platforms : {};
  const web = platforms.web && typeof platforms.web === 'object' ? platforms.web : {};

  return JSON.stringify({
    ...rules,
    webAdsEnabled: enabled,
    platforms: {
      ...platforms,
      web: {
        ...web,
        adsEnabled: enabled,
      },
    },
  });
}
