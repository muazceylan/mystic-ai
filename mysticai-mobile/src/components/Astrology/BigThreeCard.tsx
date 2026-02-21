import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getZodiacInfo } from '../../constants/zodiac';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

function getItems(C: ThemeColors, t: (k: string) => string) {
  return [
    { label: t('natalChart.sun'), borderColor: C.gold, bgColor: C.amberLight },
    { label: t('natalChart.moon'), borderColor: C.moonBlue, bgColor: C.blueBg },
    { label: t('natalChart.rising'), borderColor: C.primary, bgColor: C.primarySoft },
  ];
}

interface BigThreeCardProps {
  sunSign: string;
  moonSign: string;
  risingSign: string;
}

export default function BigThreeCard({ sunSign, moonSign, risingSign }: BigThreeCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const ITEMS = getItems(colors, t);
  const s = createStyles(colors);
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
    <View style={s.container}>
      <Text style={s.title}>{t('natalChart.bigThree')}</Text>
      <View style={s.row}>
        {signs.map((sign, i) => {
          const info = getZodiacInfo(sign);
          const item = ITEMS[i];
          return (
            <Animated.View
              key={item.label}
              style={[
                s.itemContainer,
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
                  s.circle,
                  {
                    borderColor: item.borderColor,
                    backgroundColor: item.bgColor,
                  },
                ]}
              >
                <Text style={s.symbol}>{info.symbol}</Text>
              </View>
              <Text style={s.signName}>{info.name}</Text>
              <Text style={s.label}>{item.label}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: C.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: C.borderMuted,
      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: C.textSlate,
      marginBottom: 18,
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    itemContainer: { alignItems: 'center', gap: 6 },
    circle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
    },
    symbol: { fontSize: 30 },
    signName: {
      fontSize: 14,
      fontWeight: '600',
      color: C.textSlate,
    },
    label: { fontSize: 12, color: C.muted },
  });
}
