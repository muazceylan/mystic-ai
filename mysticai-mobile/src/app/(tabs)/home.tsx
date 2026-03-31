import HomeScreen from '../../screens/HomeScreen';
import { TabSwipePager } from '../../components/navigation/TabSwipePager';

export default function HomeTabScreen() {
  return (
    <TabSwipePager tab="home">
      <HomeScreen />
    </TabSwipePager>
  );
}
