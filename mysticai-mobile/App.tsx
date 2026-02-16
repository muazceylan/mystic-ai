import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import 'react-native-reanimated';

// Must be exported or Live Theatre / Storybook crashes
export function App() {
  return <ExpoRoot context={require.context('./src/app')} />;
}

registerRootComponent(App);
