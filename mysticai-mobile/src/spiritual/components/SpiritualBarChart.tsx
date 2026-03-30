/**
 * SpiritualBarChart — SVG bar chart, ham integer değerler (normalize etmez)
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import type { BarChartDataPoint } from '../types';

interface Props {
  data: BarChartDataPoint[];
  width: number;
  height?: number;
  barColor?: string;
  labelColor?: string;
  axisColor?: string;
}

const PADDING_LEFT = 36;
const PADDING_BOTTOM = 28;
const PADDING_TOP = 12;
const PADDING_RIGHT = 8;

export const SpiritualBarChart = memo(function SpiritualBarChart({
  data,
  width,
  height = 180,
  barColor = '#4CAF50',
  labelColor = '#999',
  axisColor = '#555',
}: Props) {
  const { t } = useTranslation();
  if (!data || data.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={[styles.emptyText, { color: labelColor }]}>{t('barChart.empty')}</Text>
      </View>
    );
  }

  const chartWidth = width - PADDING_LEFT - PADDING_RIGHT;
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  // Y eksenini "güzel" bir tam sayıya yuvarla
  const yMax = Math.ceil(maxVal / 10) * 10 || 10;

  const barWidth = Math.max(4, Math.floor(chartWidth / data.length) - 4);
  const gap = (chartWidth - barWidth * data.length) / (data.length + 1);

  // Y eksen etiketleri (0, yMax/2, yMax)
  const yLabels = [0, Math.floor(yMax / 2), yMax];

  return (
    <Svg width={width} height={height}>
      {/* Y eksen etiketleri */}
      {yLabels.map((val) => {
        const y = PADDING_TOP + chartHeight - (val / yMax) * chartHeight;
        return (
          <SvgText
            key={val}
            x={PADDING_LEFT - 4}
            y={y + 4}
            textAnchor="end"
            fontSize={10}
            fill={labelColor}
          >
            {val}
          </SvgText>
        );
      })}

      {/* Barlar + X etiketleri */}
      {data.map((d, i) => {
        const barH = Math.max(2, (d.value / yMax) * chartHeight);
        const x = PADDING_LEFT + gap + i * (barWidth + gap);
        const y = PADDING_TOP + chartHeight - barH;

        return (
          <React.Fragment key={d.dateISO}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={3}
              ry={3}
              fill={d.value > 0 ? barColor : axisColor + '33'}
            />
            <SvgText
              x={x + barWidth / 2}
              y={height - 6}
              textAnchor="middle"
              fontSize={9}
              fill={labelColor}
            >
              {d.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
});

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13 },
});
