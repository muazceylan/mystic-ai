import HomeScreen from '../../screens/HomeScreen';
import { TabSwipeGesture } from '../../components/ui/TabSwipeGesture';

export default function HomeTabScreen() {
  return (
    <TabSwipeGesture tab="home">
      <HomeScreen />
    </TabSwipeGesture>
  );
}
