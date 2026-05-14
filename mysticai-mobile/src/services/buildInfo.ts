import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

export type BuildInfo = {
  appVersion: string;
  buildNumber: string;
  applicationId: string;
  platform: string;
  environment: string;
  updateChannel?: string;
  runtimeVersion?: string;
  updateId?: string;
};

export function getBuildInfo(): BuildInfo {
  const appVersion =
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    '0.0.0';

  const buildNumber =
    Application.nativeBuildVersion ??
    String(Constants.expoConfig?.android?.versionCode ?? '0');

  const applicationId =
    Application.applicationId ??
    Constants.expoConfig?.android?.package ??
    Constants.expoConfig?.ios?.bundleIdentifier ??
    'unknown';

  const platform = Platform.OS;

  const rawEnv = (process.env.EXPO_PUBLIC_APP_ENV ?? '').trim().toLowerCase();
  const environment = rawEnv || 'unknown';

  let updateChannel: string | undefined;
  let runtimeVersion: string | undefined;
  let updateId: string | undefined;

  try {
    // expo-updates is optional — dynamic require avoids a hard compile-time dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Updates = require('expo-updates') as {
      channel?: string;
      runtimeVersion?: string;
      updateId?: string;
    };
    updateChannel = Updates.channel ?? undefined;
    runtimeVersion = Updates.runtimeVersion ?? undefined;
    updateId = Updates.updateId ?? undefined;
  } catch {
    // expo-updates not installed
  }

  return {
    appVersion,
    buildNumber,
    applicationId,
    platform,
    environment,
    updateChannel,
    runtimeVersion,
    updateId,
  };
}

export function formatBuildInfoCompact(info: BuildInfo): string {
  return `v${info.appVersion} (${info.buildNumber}) · ${info.environment}`;
}

export function formatBuildInfoFull(info: BuildInfo): string {
  const lines = [
    `App: v${info.appVersion}`,
    `Build: ${info.buildNumber}`,
    `Package: ${info.applicationId}`,
    `Env: ${info.environment}`,
  ];
  if (info.updateChannel) lines.push(`Channel: ${info.updateChannel}`);
  if (info.runtimeVersion) lines.push(`Runtime: ${info.runtimeVersion}`);
  if (info.updateId) lines.push(`Update: ${info.updateId}`);
  return lines.join('\n');
}
