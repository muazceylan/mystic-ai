import React from 'react';
import { Redirect } from 'expo-router';

export default function TransitsTodayRedirect() {
  return <Redirect href="/(tabs)/daily-transits" />;
}
