import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { BATTLE_EXERCISES, TIMER_PRESETS } from '../../constants/game';
import type { TimedScore } from '../../types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

type Phase = 'setup' | 'running' | 'done' | 'submitted';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds % 60 === 0) return `${seconds / 60}min`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function TimerTab() {
  const { theme } = useTheme();

  // Phase
  const [phase, setPhase] = useState<Phase>('setup');

  // Setup
  const [exercise, setExercise] = useState(BATTLE_EXERCISES[0]);
  const [duration, setDuration] = useState(TIMER_PRESETS[1]); // default 60s
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Timer
  const [secondsLeft, setSecondsLeft] = useState(TIMER_PRESETS[1]);

  // Rep entry
  const [reps, setReps] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Results
  const [isNewPR, setIsNewPR] = useState(false);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [history, setHistory] = useState<TimedScore[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ─── Data ──────────────────────────────────

  const loadData = useCallback(async (ex: string, dur: number) => {
    setLoadingHistory(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingHistory(false); return; }

    // Last 10 entries for this exercise (any duration) — shown in history
    const { data: histData } = await supabase
      .from('timed_scores')
      .select('*')
      .eq('user_id', user.id)
      .eq('exercise', ex)
      .order('recorded_at', { ascending: false })
      .limit(10);
    setHistory(histData ?? []);

    // Personal best for this exercise + duration combo
    const { data: pbData } = await supabase
      .from('timed_scores')
      .select('reps')
      .eq('user_id', user.id)
      .eq('exercise', ex)
      .eq('duration_seconds', dur)
      .order('reps', { ascending: false })
      .limit(1)
      .maybeSingle();
    setPersonalBest(pbData?.reps ?? null);

    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    loadData(exercise, duration);
  }, [exercise, duration, loadData]);

  // ─── Timer ────────────────────────────────

  // Reset display when duration changes (setup only)
  useEffect(() => {
    if (phase === 'setup') setSecondsLeft(duration);
  }, [duration, phase]);

  // Tick interval while running
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Pulse on low time (≤5 s)
  useEffect(() => {
    if (phase === 'running' && secondsLeft <= 5 && secondsLeft > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 140, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [secondsLeft, phase, pulseAnim]);

  // Timer done
  useEffect(() => {
    if (phase === 'running' && secondsLeft === 0) {
      Vibration.vibrate([0, 300, 120, 300, 120, 600]);
      setPhase('done');
      setReps(0);
    }
  }, [secondsLeft, phase]);

  // ─── Handlers ─────────────────────────────

  const handleSelectDuration = (secs: number) => {
    setDuration(secs);
    setShowCustom(false);
    setCustomInput('');
  };

  const handleCustomApply = () => {
    const secs = parseInt(customInput, 10);
    if (isNaN(secs) || secs < 10 || secs > 3600) return;
    handleSelectDuration(secs);
  };

  const startTimer = () => {
    setSecondsLeft(duration);
    setPhase('running');
  };

  const resetTimer = () => {
    setPhase('setup');
    setSecondsLeft(duration);
    pulseAnim.setValue(1);
  };

  const handleSubmit = async () => {
    if (reps <= 0 || submitting) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const isPR = personalBest === null || reps > personalBest;

    const { error } = await supabase.from('timed_scores').insert({
      user_id: user.id,
      exercise,
      duration_seconds: duration,
      reps,
    });

    if (!error) {
      setIsNewPR(isPR);
      setPhase('submitted');
      loadData(exercise, duration);
    }
    setSubmitting(false);
  };

  const handleTryAgain = () => {
    setPhase('setup');
    setSecondsLeft(duration);
    setReps(0);
    setIsNewPR(false);
    pulseAnim.setValue(1);
  };

  // ─── Derived ──────────────────────────────

  const timerColor =
    phase === 'running' && secondsLeft <= 5 ? '#ef4444' :
    phase === 'running' && secondsLeft <= 10 ? '#f97316' :
    theme.primary;

  const historyBestReps = useMemo(
    () => history.length ? Math.max(...history.map(s => s.reps)) : null,
    [history],
  );

  // ─── Render ───────────────────────────────

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >

      {/* ── Exercise picker (setup + submitted) ── */}
      {(phase === 'setup' || phase === 'submitted') && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.primary }]}>Exercise</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {BATTLE_EXERCISES.map(ex => {
                const active = exercise === ex;
                return (
                  <TouchableOpacity
                    key={ex}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.card, borderColor: theme.border },
                      active && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}
                    onPress={() => setExercise(ex)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {ex}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── Duration picker (setup only) ── */}
      {phase === 'setup' && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.primary }]}>Duration</Text>
          <View style={styles.presetRow}>
            {TIMER_PRESETS.map(secs => {
              const active = duration === secs && !showCustom;
              return (
                <TouchableOpacity
                  key={secs}
                  style={[
                    styles.preset,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    active && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => handleSelectDuration(secs)}
                >
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>
                    {formatDuration(secs)}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[
                styles.preset,
                { backgroundColor: theme.card, borderColor: theme.border },
                showCustom && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={() => setShowCustom(v => !v)}
            >
              <Text style={[styles.presetText, showCustom && styles.presetTextActive]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {showCustom && (
            <View style={styles.customRow}>
              <TextInput
                style={[
                  styles.customInput,
                  { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                ]}
                placeholder="10–3600 seconds"
                placeholderTextColor="#555"
                value={customInput}
                onChangeText={setCustomInput}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="done"
                onSubmitEditing={handleCustomApply}
              />
              <TouchableOpacity
                style={[styles.customApplyBtn, { backgroundColor: theme.primary }]}
                onPress={handleCustomApply}
              >
                <Text style={styles.customApplyText}>Set</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Timer ring (running + done) ── */}
      {(phase === 'running' || phase === 'done') && (
        <View style={styles.timerSection}>
          <Text style={[styles.timerExercise, { color: theme.primary }]}>{exercise}</Text>
          <Text style={[styles.timerDuration, { color: '#888' }]}>
            {formatDuration(duration)} challenge
          </Text>
          <Animated.View
            style={[
              styles.timerRing,
              { borderColor: phase === 'done' ? '#ef4444' : timerColor },
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            {phase === 'running' ? (
              <Text style={[styles.timerDigits, { color: timerColor }]}>
                {formatTime(secondsLeft)}
              </Text>
            ) : (
              <>
                <Text style={[styles.timesUpText, { color: '#ef4444' }]}>TIME'S</Text>
                <Text style={[styles.timesUpText, { color: '#ef4444' }]}>UP!</Text>
              </>
            )}
          </Animated.View>
        </View>
      )}

      {/* ── Start button (setup) ── */}
      {phase === 'setup' && (
        <View style={styles.startSection}>
          <Text style={[styles.durationPreview, { color: '#888' }]}>
            {formatTime(secondsLeft)}
          </Text>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: theme.primary }]}
            onPress={startTimer}
          >
            <Text style={styles.startBtnText}>▶  START</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Reset button (running) ── */}
      {phase === 'running' && (
        <TouchableOpacity
          style={[styles.resetBtn, { borderColor: theme.border }]}
          onPress={resetTimer}
        >
          <Text style={[styles.resetBtnText, { color: '#888' }]}>Reset</Text>
        </TouchableOpacity>
      )}

      {/* ── Rep entry (done) ── */}
      {phase === 'done' && (
        <View style={styles.repSection}>
          <Text style={[styles.repLabel, { color: theme.text }]}>How many reps?</Text>

          <View style={styles.repRow}>
            <TouchableOpacity
              style={[styles.repBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setReps(r => Math.max(0, r - 1))}
            >
              <Text style={[styles.repBtnText, { color: theme.text }]}>−</Text>
            </TouchableOpacity>

            <Text style={[styles.repCount, { color: theme.text }]}>{reps}</Text>

            <TouchableOpacity
              style={[styles.repBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setReps(r => r + 1)}
            >
              <Text style={[styles.repBtnText, { color: theme.text }]}>+</Text>
            </TouchableOpacity>
          </View>

          {personalBest !== null && (
            <Text style={styles.pbHint}>
              Your best: {personalBest} reps
              {reps > personalBest ? '  🔥 New PR!' : ''}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: reps > 0 ? theme.primary : theme.card },
            ]}
            onPress={handleSubmit}
            disabled={reps <= 0 || submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={[styles.submitBtnText, { color: reps > 0 ? '#fff' : '#555' }]}>
                  Submit Score
                </Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetLink} onPress={resetTimer}>
            <Text style={[styles.resetLinkText, { color: '#666' }]}>Cancel & Reset</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Summary card (submitted) ── */}
      {phase === 'submitted' && (
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.card,
              borderColor: isNewPR ? theme.primary : theme.border,
              shadowColor: isNewPR ? theme.primary : 'transparent',
            },
          ]}
        >
          <Text style={styles.summaryIcon}>{isNewPR ? '🏆' : '✅'}</Text>
          <Text style={[styles.summaryTitle, { color: isNewPR ? theme.primary : theme.text }]}>
            {isNewPR ? 'New Personal Record!' : 'Score Saved!'}
          </Text>
          <Text style={[styles.summaryDetail, { color: '#888' }]}>
            {exercise}  ·  {formatDuration(duration)}  ·  <Text style={{ color: theme.text, fontWeight: '700' }}>{reps} reps</Text>
          </Text>
          <TouchableOpacity
            style={[styles.tryAgainBtn, { backgroundColor: theme.primary }]}
            onPress={handleTryAgain}
          >
            <Text style={styles.tryAgainBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Score history ── */}
      {(phase === 'setup' || phase === 'submitted') && (
        <View style={styles.historySection}>
          <Text style={[styles.sectionLabel, { color: theme.primary }]}>
            Recent — {exercise}
          </Text>

          {loadingHistory ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 12 }} />
          ) : history.length === 0 ? (
            <Text style={styles.emptyHistory}>
              No scores yet. Start your first challenge!
            </Text>
          ) : (
            history.map(entry => {
              const isBest = entry.reps === historyBestReps;
              return (
                <View
                  key={entry.id}
                  style={[
                    styles.historyRow,
                    { backgroundColor: theme.card, borderColor: isBest ? theme.primary : theme.border },
                  ]}
                >
                  <View>
                    <Text style={[styles.historyExercise, { color: theme.text }]}>
                      {formatDuration(entry.duration_seconds)}
                    </Text>
                    <Text style={styles.historyDate}>{formatDate(entry.recorded_at)}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={[styles.historyReps, { color: isBest ? theme.primary : theme.text }]}>
                      {entry.reps} reps
                    </Text>
                    {isBest && (
                      <View style={[styles.bestBadge, { backgroundColor: theme.primary }]}>
                        <Text style={styles.bestBadgeText}>PR</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 48,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Exercise chips
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  chipTextActive: {
    color: '#fff',
  },

  // Duration presets
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  preset: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  presetTextActive: {
    color: '#fff',
  },

  // Custom duration
  customRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  customApplyBtn: {
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customApplyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Setup: duration preview + start
  startSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  durationPreview: {
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: 4,
    marginBottom: 20,
    fontVariant: ['tabular-nums'],
  },
  startBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },

  // Timer ring
  timerSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  timerExercise: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  timerDuration: {
    fontSize: 13,
    marginBottom: 28,
  },
  timerRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerDigits: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  timesUpText: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },

  // Reset (running phase)
  resetBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Rep entry
  repSection: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  repLabel: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 24,
  },
  repRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    marginBottom: 16,
  },
  repBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  repBtnText: {
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 36,
  },
  repCount: {
    fontSize: 64,
    fontWeight: '900',
    minWidth: 90,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  pbHint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 24,
  },
  submitBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  resetLink: {
    paddingVertical: 10,
  },
  resetLinkText: {
    fontSize: 14,
  },

  // Summary
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  summaryIcon: {
    fontSize: 52,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryDetail: {
    fontSize: 15,
    marginBottom: 24,
    textAlign: 'center',
  },
  tryAgainBtn: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  tryAgainBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // History
  historySection: {
    marginTop: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyExercise: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#555',
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyReps: {
    fontSize: 16,
    fontWeight: '700',
  },
  bestBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  emptyHistory: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
});
