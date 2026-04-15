import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useFitRankX } from '../../lib/store';
import { useTheme, ThemeColors } from '../../lib/theme';
import { WeightLog } from '../../types';

const LBS_TO_KG = 0.453592;

// ─── Helpers ─────────────────────────────────

function toDisplay(lbs: number, unit: 'lbs' | 'kg') {
  return unit === 'kg'
    ? `${(lbs * LBS_TO_KG).toFixed(1)} kg`
    : `${lbs.toFixed(1)} lbs`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Main screen ─────────────────────────────

export default function WeightScreen() {
  const { weightLogs, logWeight, loadWeightLogs } = useFitRankX();
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [logging, setLogging] = useState(false);
  const styles = makeStyles(theme);

  useFocusEffect(
    useCallback(() => {
      loadWeightLogs();
    }, []),
  );

  const handleLog = async () => {
    const raw = parseFloat(input);
    if (isNaN(raw) || raw <= 0) return;
    const lbs = unit === 'kg' ? raw / LBS_TO_KG : raw;
    setLogging(true);
    await logWeight(parseFloat(lbs.toFixed(1)));
    setInput('');
    setLogging(false);
  };

  // Stats — logs are newest-first from store
  const current = weightLogs[0]?.weight_lbs ?? null;
  const start = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_lbs : null;
  const change = current !== null && start !== null && weightLogs.length > 1
    ? current - start
    : null;

  // Chart uses last 10, flipped to chronological order
  const chartLogs = [...weightLogs].slice(0, 10).reverse();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Weight</Text>
            <View style={styles.unitToggle}>
              {(['lbs', 'kg'] as const).map(u => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stats */}
          {weightLogs.length > 0 && (
            <View style={styles.statsRow}>
              <StatBox
                label="Start"
                value={start ? toDisplay(start, unit) : '—'}
                theme={theme}
              />
              <StatBox
                label="Change"
                value={
                  change !== null
                    ? `${change >= 0 ? '+' : ''}${toDisplay(Math.abs(change), unit).replace(' lbs', '').replace(' kg', '')} ${unit}`
                    : '—'
                }
                valueColor={
                  change === null ? '#888'
                  : change < 0 ? '#34d399'
                  : change > 0 ? '#f87171'
                  : '#888'
                }
                theme={theme}
              />
              <StatBox
                label="Current"
                value={current ? toDisplay(current, unit) : '—'}
                primary
                theme={theme}
              />
            </View>
          )}

          {/* Log input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={`Enter weight (${unit})`}
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
              value={input}
              onChangeText={setInput}
              returnKeyType="done"
              onSubmitEditing={handleLog}
            />
            <TouchableOpacity
              style={[styles.logBtn, (!input || logging) && styles.logBtnDisabled]}
              onPress={handleLog}
              disabled={!input || logging}
            >
              <Text style={styles.logBtnText}>{logging ? '...' : 'Log'}</Text>
            </TouchableOpacity>
          </View>

          {/* Trend chart */}
          {chartLogs.length > 1 && (
            <>
              <Text style={styles.sectionTitle}>Trend</Text>
              <WeightChart logs={chartLogs} unit={unit} theme={theme} />
            </>
          )}

          {/* History */}
          {weightLogs.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>History</Text>
              {weightLogs.map((log, i) => {
                const prev = weightLogs[i + 1];
                const delta = prev ? log.weight_lbs - prev.weight_lbs : null;
                return (
                  <HistoryRow
                    key={log.id}
                    log={log}
                    delta={delta}
                    unit={unit}
                    theme={theme}
                  />
                );
              })}
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⚖️</Text>
              <Text style={styles.emptyText}>Log your first weight to get started</Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Stat box ────────────────────────────────

function StatBox({
  label, value, valueColor, primary, theme,
}: {
  label: string;
  value: string;
  valueColor?: string;
  primary?: boolean;
  theme: ThemeColors;
}) {
  return (
    <View style={[
      statStyles.box,
      { backgroundColor: theme.card, borderColor: primary ? theme.primary : theme.border },
    ]}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[
        statStyles.value,
        { color: valueColor ?? (primary ? theme.primary : '#fff') },
      ]}>
        {value}
      </Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  label: { color: '#888', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 15, fontWeight: '900' },
});

// ─── Weight chart ─────────────────────────────

const CHART_H = 120;
const PAD = { top: 16, bottom: 20, left: 36, right: 12 };

function WeightChart({ logs, unit, theme }: { logs: WeightLog[]; unit: 'lbs' | 'kg'; theme: ThemeColors }) {
  const [chartWidth, setChartWidth] = useState(320);

  const weights = logs.map(l => l.weight_lbs);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const innerW = chartWidth - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const n = logs.length;

  const pts = logs.map((l, i) => ({
    x: PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW),
    y: PAD.top + innerH - ((l.weight_lbs - minW) / range) * innerH,
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');

  const fmtAxis = (lbs: number) =>
    unit === 'kg' ? (lbs * LBS_TO_KG).toFixed(1) : lbs.toFixed(1);

  return (
    <View
      style={[chartStyles.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}
      onLayout={e => setChartWidth(e.nativeEvent.layout.width)}
    >
      <Svg width={chartWidth} height={CHART_H}>
        {/* Horizontal guide lines */}
        {[0, 0.5, 1].map((frac, i) => (
          <Line
            key={i}
            x1={PAD.left}
            y1={PAD.top + innerH * (1 - frac)}
            x2={chartWidth - PAD.right}
            y2={PAD.top + innerH * (1 - frac)}
            stroke={theme.border}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}

        {/* Y-axis labels */}
        <SvgText x={2} y={PAD.top + 4} fill="#666" fontSize={9} textAnchor="start">
          {fmtAxis(maxW)}
        </SvgText>
        <SvgText x={2} y={PAD.top + innerH + 4} fill="#666" fontSize={9} textAnchor="start">
          {fmtAxis(minW)}
        </SvgText>

        {/* Line */}
        {n > 1 && (
          <Polyline
            points={polyline}
            fill="none"
            stroke={theme.primary}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Dots */}
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={theme.primary} />
        ))}

        {/* X-axis date labels — first and last only */}
        {n > 0 && (
          <>
            <SvgText x={pts[0].x} y={CHART_H - 4} fill="#666" fontSize={9} textAnchor="middle">
              {formatDate(logs[0].logged_date)}
            </SvgText>
            {n > 1 && (
              <SvgText x={pts[n - 1].x} y={CHART_H - 4} fill="#666" fontSize={9} textAnchor="middle">
                {formatDate(logs[n - 1].logged_date)}
              </SvgText>
            )}
          </>
        )}
      </Svg>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, marginBottom: 24, overflow: 'hidden' },
});

// ─── History row ─────────────────────────────

function HistoryRow({
  log, delta, unit, theme,
}: {
  log: WeightLog;
  delta: number | null;
  unit: 'lbs' | 'kg';
  theme: ThemeColors;
}) {
  let deltaIcon = '—';
  let deltaColor = '#555';
  let deltaText = '';

  if (delta !== null) {
    if (delta > 0.05) {
      deltaIcon = '↑';
      deltaColor = '#f87171';
      deltaText = `+${toDisplay(delta, unit)}`;
    } else if (delta < -0.05) {
      deltaIcon = '↓';
      deltaColor = '#34d399';
      deltaText = toDisplay(Math.abs(delta), unit);
    } else {
      deltaIcon = '—';
      deltaColor = '#555';
    }
  }

  return (
    <View style={[rowStyles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={rowStyles.date}>{formatDate(log.logged_date)}</Text>
      <Text style={[rowStyles.weight, { color: '#fff' }]}>{toDisplay(log.weight_lbs, unit)}</Text>
      <View style={rowStyles.delta}>
        <Text style={[rowStyles.deltaIcon, { color: deltaColor }]}>{deltaIcon}</Text>
        {deltaText ? <Text style={[rowStyles.deltaText, { color: deltaColor }]}>{deltaText}</Text> : null}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
  },
  date: { color: '#888', fontSize: 13, flex: 1 },
  weight: { fontSize: 15, fontWeight: '700', marginRight: 12 },
  delta: { flexDirection: 'row', alignItems: 'center', width: 72, justifyContent: 'flex-end' },
  deltaIcon: { fontSize: 15, fontWeight: '900', marginRight: 2 },
  deltaText: { fontSize: 12, fontWeight: '600' },
});

// ─── Styles ───────────────────────────────────

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20, paddingBottom: 48 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    title: { color: theme.text, fontSize: 26, fontWeight: '900' },
    unitToggle: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    unitBtn: { paddingVertical: 6, paddingHorizontal: 14 },
    unitBtnActive: { backgroundColor: theme.primary },
    unitBtnText: { color: '#555', fontWeight: '700', fontSize: 13 },
    unitBtnTextActive: { color: '#fff' },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    inputRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    input: {
      flex: 1,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 14,
      color: theme.text,
      fontSize: 16,
    },
    logBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logBtnDisabled: { opacity: 0.4 },
    logBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    sectionTitle: {
      color: '#888',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 10,
      letterSpacing: 0.5,
    },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { color: '#555', fontSize: 15, textAlign: 'center' },
  });
}
