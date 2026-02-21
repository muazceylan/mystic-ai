import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { COLORS } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 48 - 48) / 7); // modal padding + inner padding

const DAYS_TR = ['Pt', 'Sa', 'Ca', 'Pe', 'Cu', 'Ct', 'Pz'];
const MONTHS_TR = [
  'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
  'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik',
];

interface CalendarPickerProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

export default function CalendarPicker({
  selectedDate,
  onSelect,
  minimumDate = new Date(1920, 0, 1),
  maximumDate = new Date(),
}: CalendarPickerProps) {
  const initDate = selectedDate || new Date(1995, 5, 15);
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [showYearGrid, setShowYearGrid] = useState(false);
  const [showMonthGrid, setShowMonthGrid] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  }, []);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Monday = 0, Sunday = 6
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { day: number; month: number; year: number; isCurrentMonth: boolean; disabled: boolean }[] = [];

    // Previous month days
    for (let i = startDow - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth - 1;
      const y = m < 0 ? viewYear - 1 : viewYear;
      const actualMonth = m < 0 ? 11 : m;
      cells.push({ day: d, month: actualMonth, year: y, isCurrentMonth: false, disabled: true });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const disabled = date < minimumDate || date > maximumDate;
      cells.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true, disabled });
    }

    // Next month days to fill grid
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth + 1;
      const y = m > 11 ? viewYear + 1 : viewYear;
      const actualMonth = m > 11 ? 0 : m;
      cells.push({ day: d, month: actualMonth, year: y, isCurrentMonth: false, disabled: true });
    }

    return cells;
  }, [viewYear, viewMonth, minimumDate, maximumDate]);

  const goToPrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }, [viewMonth, viewYear]);

  const goToNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }, [viewMonth, viewYear]);

  const isSelected = (day: number, month: number, year: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  const isToday = (day: number, month: number, year: number) => {
    return today.day === day && today.month === month && today.year === year;
  };

  // Year grid
  const yearRange = useMemo(() => {
    const years: number[] = [];
    for (let y = maximumDate.getFullYear(); y >= minimumDate.getFullYear(); y--) {
      years.push(y);
    }
    return years;
  }, [minimumDate, maximumDate]);

  const yearScrollRef = useRef<ScrollView>(null);

  // Scroll to selected year when year grid opens
  useEffect(() => {
    if (showYearGrid && yearScrollRef.current) {
      const index = yearRange.indexOf(viewYear);
      if (index >= 0) {
        setTimeout(() => {
          yearScrollRef.current?.scrollTo({ y: Math.max(0, Math.floor(index / 4) * 48 - 100), animated: false });
        }, 50);
      }
    }
  }, [showYearGrid, viewYear, yearRange]);

  if (showYearGrid) {
    return (
      <View style={styles.yearGrid}>
        <View style={styles.yearGridHeader}>
          <Text style={styles.yearGridTitle}>Yil Secin</Text>
        <TouchableOpacity
            onPress={() => setShowYearGrid(false)}
            accessibilityLabel="Yıl seçimini kapat"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color={COLORS.subtext} />
          </TouchableOpacity>
        </View>
        <ScrollView
          ref={yearScrollRef}
          style={styles.yearGridScroll}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled
        >
          <View style={styles.yearGridContainer}>
            {yearRange.map((y) => {
              const isCurrent = y === viewYear;
              return (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearCell, isCurrent && styles.yearCellSelected]}
                  onPress={() => {
                    setViewYear(y);
                    setShowYearGrid(false);
                    setShowMonthGrid(true);
                  }}
                  accessibilityLabel={`${y} yılını seç`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.yearCellText, isCurrent && styles.yearCellTextSelected]}>
                    {y}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (showMonthGrid) {
    return (
      <View style={styles.yearGrid}>
        <View style={styles.yearGridHeader}>
          <Text style={styles.yearGridTitle}>{viewYear} — Ay Seçin</Text>
          <TouchableOpacity
            onPress={() => setShowMonthGrid(false)}
            accessibilityLabel="Ay seçimini kapat"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color={COLORS.subtext} />
          </TouchableOpacity>
        </View>
        <View style={styles.monthGridContainer}>
          {MONTHS_TR.map((month, idx) => {
            const isCurrent = idx === viewMonth;
            return (
              <TouchableOpacity
                key={month}
                style={[styles.monthCell, isCurrent && styles.yearCellSelected]}
                onPress={() => {
                  setViewMonth(idx);
                  setShowMonthGrid(false);
                }}
                accessibilityLabel={`${month} ayını seç`}
                accessibilityRole="button"
              >
                <Text style={[styles.monthCellText, isCurrent && styles.yearCellTextSelected]}>
                  {month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header: month/year + nav arrows */}
      <View style={styles.header}>
          <TouchableOpacity
            onPress={goToPrevMonth}
            style={styles.navButton}
            accessibilityLabel="Önceki ay"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowYearGrid(true)}
          style={styles.monthYearButton}
          accessibilityLabel={`${MONTHS_TR[viewMonth]} ${viewYear} — ay ve yıl seç`}
          accessibilityRole="button"
        >
          <Text style={styles.monthYearText}>
            {MONTHS_TR[viewMonth]} {viewYear}
          </Text>
          <Ionicons name="caret-down" size={14} color={COLORS.primary} />
        </TouchableOpacity>

          <TouchableOpacity
            onPress={goToNextMonth}
            style={styles.navButton}
            accessibilityLabel="Sonraki ay"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
          <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
          </TouchableOpacity>
      </View>

      {/* Day-of-week labels */}
      <View style={styles.weekRow}>
        {DAYS_TR.map((d) => (
          <View key={d} style={styles.weekCell}>
            <Text style={styles.weekLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {calendarDays.map((cell, index) => {
          const selected = isSelected(cell.day, cell.month, cell.year);
          const todayMark = isToday(cell.day, cell.month, cell.year);

          return (
            <TouchableOpacity
              key={index}
              style={styles.dayCell}
              disabled={cell.disabled}
              onPress={() => {
                if (!cell.disabled && cell.isCurrentMonth) {
                  onSelect(new Date(cell.year, cell.month, cell.day));
                }
              }}
              accessibilityLabel={cell.disabled ? undefined : `${cell.day} ${MONTHS_TR[cell.month]} ${cell.year} tarihini seç`}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.dayCircle,
                  selected && styles.dayCircleSelected,
                  todayMark && !selected && styles.dayCircleToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !cell.isCurrentMonth && styles.dayTextOutside,
                    cell.disabled && cell.isCurrentMonth && styles.dayTextDisabled,
                    selected && styles.dayTextSelected,
                    todayMark && !selected && styles.dayTextToday,
                  ]}
                >
                  {cell.day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
  },
  monthYearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.subtext,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelected: {
    backgroundColor: COLORS.primary,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  dayTextOutside: {
    color: COLORS.disabled,
  },
  dayTextDisabled: {
    color: COLORS.disabled,
  },
  dayTextSelected: {
    color: COLORS.surface,
    fontWeight: '700',
  },
  dayTextToday: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  // Year grid
  yearGrid: {
    width: '100%',
  },
  yearGridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  yearGridTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  yearGridScroll: {
    maxHeight: 300,
  },
  yearGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  yearCell: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  yearCellSelected: {
    backgroundColor: COLORS.primary,
  },
  yearCellText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  yearCellTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  // Month grid
  monthGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  monthCell: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthCellText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
});
