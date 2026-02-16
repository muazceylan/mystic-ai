import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TextStyle } from 'react-native';

const MAX_STAGGER = 6;

interface Props {
  text: string;
  style?: TextStyle;
}

export default function StaggeredAiText({ text, style }: Props) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const animValues = useRef<Animated.Value[]>([]);

  // Create / reset anim values when paragraph count changes
  if (animValues.current.length !== paragraphs.length) {
    animValues.current = paragraphs.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    // Reset all values
    animValues.current.forEach((v) => v.setValue(0));

    const staggerCount = Math.min(paragraphs.length, MAX_STAGGER);
    const animationsToStagger = animValues.current.slice(0, staggerCount).map((v) =>
      Animated.timing(v, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    );

    // Show remaining paragraphs immediately
    animValues.current.slice(staggerCount).forEach((v) => v.setValue(1));

    Animated.stagger(500, animationsToStagger).start();
  }, [text]);

  return (
    <View style={styles.container}>
      {paragraphs.map((para, i) => {
        const anim = animValues.current[i];
        if (!anim) return null;

        return (
          <Animated.Text
            key={`${i}-${para.slice(0, 20)}`}
            style={[
              styles.paragraph,
              style,
              {
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {para}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
});
