import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { getZodiacInfo } from '../../constants/zodiac';

interface BigThreeCardProps {
  sunSign: string;
  moonSign: string;
  risingSign: string;
}

const ITEMS = [
  {
    label: 'Güneş',
    borderColor: '#D4AF37',
    bgColor: 'rgba(212,175,55,0.1)',
  },
  {
    label: 'Ay',
    borderColor: '#7B9EC7',
    bgColor: 'rgba(123,158,199,0.1)',
  },
  {
    label: 'Yükselen',
    borderColor: '#9D4EDD',
    bgColor: 'rgba(157,78,221,0.1)',
  },
];

export default function BigThreeCard({ sunSign, moonSign, risingSign }: BigThreeCardProps) {
  const signs = [sunSign, moonSign, risingSign];
  const anims = useRef(signs.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: i * 150,
        useNativeDriver: true,
      })
    );
    Animated.stagger(150, animations).start();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Büyük Üçlü</Text>
      <View style={styles.row}>
        {signs.map((sign, i) => {
          const info = getZodiacInfo(sign);
          const item = ITEMS[i];
          return (
            <Animated.View
              key={item.label}
              style={[
                styles.itemContainer,
                {
                  opacity: anims[i],
                  transform: [
                    {
                      scale: anims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.circle,
                  {
                    borderColor: item.borderColor,
                    backgroundColor: item.bgColor,
                  },
                ]}
              >
                <Text style={styles.symbol}>{info.symbol}</Text>
              </View>
              <Text style={styles.signName}>{info.name}</Text>
              <Text style={styles.label}>{item.label}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F0F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 18,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  itemContainer: {
    alignItems: 'center',
    gap: 6,
  },
  circle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  symbol: {
    fontSize: 30,
  },
  signName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  label: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
