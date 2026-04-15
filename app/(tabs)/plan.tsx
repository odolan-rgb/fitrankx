import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../../lib/theme';
import { useFitRankX } from '../../lib/store';
import { Plan, PlanMilestone } from '../../types';

// ─────────────────────────────────────────────
// Progress Ring (two-semicircle technique)
// ─────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const { theme } = useTheme();
  const SIZE = 96;
  const HALF = SIZE / 2;
  const STROKE = 10;
  const INNER = SIZE - STROKE * 2;

  const clamp = Math.min(100, Math.max(0, pct));
  // Right half: sweeps from -180° (hidden) to 0° (shown) as pct goes 0→50
  const rightDeg = -180 + (Math.min(clamp, 50) / 50) * 180;
  // Left half: sweeps from 180° (hidden) to 0° (shown) as pct goes 50→100
  const leftDeg = 180 - (Math.max(clamp - 50, 0) / 50) * 180;

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      {/* Track */}
      <View style={{
        position: 'absolute', width: SIZE, height: SIZE,
        borderRadius: HALF, backgroundColor: theme.border,
      }} />

      {/* Right semicircle fill (0–50%) */}
      <View style={{ position: 'absolute', right: 0, width: HALF, height: SIZE, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', left: -HALF, width: SIZE, height: SIZE,
          borderRadius: HALF, backgroundColor: theme.primary,
          transform: [{ rotate: `${rightDeg}deg` }],
        }} />
      </View>

      {/* Left semicircle fill (50–100%) */}
      <View style={{ position: 'absolute', left: 0, width: HALF, height: SIZE, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', left: 0, width: SIZE, height: SIZE,
          borderRadius: HALF, backgroundColor: theme.primary,
          transform: [{ rotate: `${leftDeg}deg` }],
        }} />
      </View>

      {/* Donut hole */}
      <View style={{
        position: 'absolute', top: STROKE, left: STROKE,
        width: INNER, height: INNER, borderRadius: INNER / 2,
        backgroundColor: theme.card,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: theme.text, fontWeight: '900', fontSize: 20 }}>
          {Math.round(clamp)}%
        </Text>
        <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '700' }}>done</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────

export default function PlanScreen() {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const {
    plans, loadPlans, createPlan, toggleMilestone, addJournalEntry, deletePlan,
  } = useFitRankX();

  // ── View state
  const [view, setView] = useState<'detail' | 'create'>('detail');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Create form state
  const [formName, setFormName] = useState('');
  const [formGoal, setFormGoal] = useState('');
  const [formDate, setFormDate] = useState('');
  const [milestoneInput, setMilestoneInput] = useState('');
  const [draftMilestones, setDraftMilestones] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Journal state
  const [journalInput, setJournalInput] = useState('');
  const [addingEntry, setAddingEntry] = useState(false);

  // ── Bootstrap
  useEffect(() => {
    loadPlans();
  }, []);

  // Pick newest plan as default once plans load
  useEffect(() => {
    if (plans.length > 0 && selectedId === null) {
      setSelectedId(plans[0].id);
      setView('detail');
    } else if (plans.length === 0) {
      setView('create');
    }
  }, [plans.length]);

  // ── Handlers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlans();
    setRefreshing(false);
  }, []);

  const handleAddMilestone = () => {
    const text = milestoneInput.trim();
    if (!text) return;
    setDraftMilestones(prev => [...prev, text]);
    setMilestoneInput('');
  };

  const handleRemoveMilestone = (idx: number) =>
    setDraftMilestones(prev => prev.filter((_, i) => i !== idx));

  const handleSavePlan = async () => {
    if (!formName.trim()) { Alert.alert('Name required', 'Please enter a plan name.'); return; }
    if (!formGoal.trim()) { Alert.alert('Goal required', 'Please describe your goal.'); return; }
    setSaving(true);
    const plan = await createPlan(
      formName.trim(), formGoal.trim(),
      formDate.trim() || null,
      draftMilestones,
    );
    setSaving(false);
    if (plan) {
      setFormName(''); setFormGoal(''); setFormDate('');
      setDraftMilestones([]); setMilestoneInput('');
      setSelectedId(plan.id);
      setView('detail');
    }
  };

  const handleNewPlan = () => {
    setFormName(''); setFormGoal(''); setFormDate('');
    setDraftMilestones([]); setMilestoneInput('');
    setView('create');
  };

  const handleDeletePlan = (plan: Plan) => {
    Alert.alert(
      'Delete plan?',
      `"${plan.name}" and all its milestones and journal entries will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => { await deletePlan(plan.id); setSelectedId(null); },
        },
      ]
    );
  };

  const handleAddJournalEntry = async (planId: string) => {
    const text = journalInput.trim();
    if (!text) return;
    setAddingEntry(true);
    await addJournalEntry(planId, text);
    setJournalInput('');
    setAddingEntry(false);
  };

  // ── Derived values
  const selectedPlan = plans.find(p => p.id === selectedId) ?? null;
  const milestones: PlanMilestone[] = selectedPlan?.milestones ?? [];
  const completedCount = milestones.filter(m => m.completed).length;
  const progressPct = milestones.length > 0
    ? Math.round((completedCount / milestones.length) * 100)
    : 0;

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ── */}
          <View style={s.header}>
            <Text style={s.title}>My Plans</Text>
            <TouchableOpacity style={[s.newBtn, { borderColor: theme.border }]} onPress={handleNewPlan}>
              <Text style={[s.newBtnText, { color: theme.primary }]}>+ New Plan</Text>
            </TouchableOpacity>
          </View>

          {/* ── Plan selector pills (only when 2+ plans) ── */}
          {plans.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.pillRow}
              contentContainerStyle={s.pillContent}
            >
              {plans.map(p => {
                const active = selectedId === p.id && view === 'detail';
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      s.pill,
                      { backgroundColor: theme.card, borderColor: theme.border },
                      active && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}
                    onPress={() => { setSelectedId(p.id); setView('detail'); }}
                  >
                    <Text style={[s.pillText, active && { color: '#fff' }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* ════════ CREATE FORM ════════ */}
          {view === 'create' && (
            <View>
              <Text style={s.sectionTitle}>New Plan</Text>

              <Text style={s.fieldLabel}>Plan Name *</Text>
              <TextInput
                value={formName} onChangeText={setFormName}
                placeholder="e.g. Summer Shred"
                placeholderTextColor={theme.border}
                style={[s.input, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text }]}
              />

              <Text style={s.fieldLabel}>Goal *</Text>
              <TextInput
                value={formGoal} onChangeText={setFormGoal}
                placeholder="Describe what you want to achieve"
                placeholderTextColor={theme.border}
                multiline numberOfLines={3}
                style={[s.input, s.inputMulti, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text }]}
              />

              <Text style={s.fieldLabel}>Target Date (optional)</Text>
              <TextInput
                value={formDate} onChangeText={setFormDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.border}
                style={[s.input, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text }]}
              />

              <Text style={s.fieldLabel}>Milestones</Text>
              <View style={s.milestoneInputRow}>
                <TextInput
                  value={milestoneInput} onChangeText={setMilestoneInput}
                  placeholder="Add a milestone…"
                  placeholderTextColor={theme.border}
                  style={[s.input, s.milestoneInput, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text }]}
                  onSubmitEditing={handleAddMilestone}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[s.addMilestoneBtn, { backgroundColor: theme.primary }]}
                  onPress={handleAddMilestone}
                >
                  <Text style={s.addMilestoneBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {draftMilestones.map((text, idx) => (
                <View key={idx} style={[s.draftMilestone, { borderColor: theme.border, backgroundColor: theme.card }]}>
                  <Text style={[s.draftMilestoneNum, { color: theme.primary }]}>{idx + 1}</Text>
                  <Text style={[s.draftMilestoneText, { color: theme.text }]} numberOfLines={2}>{text}</Text>
                  <TouchableOpacity onPress={() => handleRemoveMilestone(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={s.removeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: theme.primary }, saving && s.dimmed]}
                onPress={handleSavePlan}
                disabled={saving}
              >
                <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Plan'}</Text>
              </TouchableOpacity>

              {plans.length > 0 && (
                <TouchableOpacity
                  style={[s.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => { setSelectedId(plans[0].id); setView('detail'); }}
                >
                  <Text style={[s.cancelBtnText, { color: theme.primary }]}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ════════ PLAN DETAIL ════════ */}
          {view === 'detail' && selectedPlan && (
            <>
              {/* ── Plan header card ── */}
              <View style={[s.planCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={s.planCardTop}>
                  <View style={{ flex: 1, marginRight: 14 }}>
                    <Text style={[s.planName, { color: theme.text }]}>{selectedPlan.name}</Text>
                    <Text style={[s.planGoal, { color: '#aaa' }]}>{selectedPlan.goal}</Text>
                    {selectedPlan.target_date && (() => {
                      const days = daysUntil(selectedPlan.target_date!);
                      const label = days > 0
                        ? `${days} day${days !== 1 ? 's' : ''} left`
                        : days === 0 ? 'Due today!'
                        : `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
                      const labelColor = days < 0 ? '#ef4444' : days <= 3 ? '#f97316' : '#888';
                      return (
                        <Text style={[s.planDate, { color: labelColor }]}>
                          📅 {formatDate(selectedPlan.target_date!)} · {label}
                        </Text>
                      );
                    })()}
                  </View>
                  {milestones.length > 0 && <ProgressRing pct={progressPct} />}
                </View>

                {milestones.length > 0 && (
                  <Text style={s.progressSub}>
                    {completedCount} / {milestones.length} milestones complete
                  </Text>
                )}

                <TouchableOpacity onPress={() => handleDeletePlan(selectedPlan)} style={{ marginTop: 6 }}>
                  <Text style={s.deleteLink}>Delete plan</Text>
                </TouchableOpacity>
              </View>

              {/* ── Milestones ── */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>
                  Milestones{milestones.length > 0 ? ` · ${completedCount}/${milestones.length}` : ''}
                </Text>

                {milestones.length === 0 ? (
                  <Text style={s.emptyText}>No milestones added.</Text>
                ) : (
                  milestones.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        s.milestoneRow,
                        { borderColor: theme.border, backgroundColor: theme.card },
                        m.completed && s.dimmed,
                      ]}
                      onPress={() => toggleMilestone(m.id, !m.completed)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        s.checkbox,
                        { borderColor: m.completed ? theme.primary : theme.border },
                        m.completed && { backgroundColor: theme.primary },
                      ]}>
                        {m.completed && <Text style={s.checkmark}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          s.milestoneText, { color: theme.text },
                          m.completed && s.milestoneStrike,
                        ]}>
                          {m.text}
                        </Text>
                        {m.completed && m.completed_at && (
                          <Text style={s.milestoneDoneAt}>
                            Done {formatTimestamp(m.completed_at)}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* ── Journal ── */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Journal</Text>

                <View style={[s.journalInputWrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
                  <TextInput
                    value={journalInput} onChangeText={setJournalInput}
                    placeholder="What did you do today?"
                    placeholderTextColor={theme.border}
                    multiline numberOfLines={3}
                    style={[s.journalInput, { color: theme.text }]}
                  />
                  <TouchableOpacity
                    style={[
                      s.addEntryBtn, { backgroundColor: theme.primary },
                      (!journalInput.trim() || addingEntry) && s.dimmed,
                    ]}
                    onPress={() => handleAddJournalEntry(selectedPlan.id)}
                    disabled={!journalInput.trim() || addingEntry}
                  >
                    <Text style={s.addEntryBtnText}>{addingEntry ? '…' : 'Add Entry'}</Text>
                  </TouchableOpacity>
                </View>

                {(selectedPlan.log_entries ?? []).length === 0 ? (
                  <Text style={s.emptyText}>No journal entries yet.</Text>
                ) : (
                  (selectedPlan.log_entries ?? []).map(entry => (
                    <View key={entry.id} style={[s.journalEntry, { borderColor: theme.border, backgroundColor: theme.card }]}>
                      <Text style={[s.journalEntryDate, { color: theme.primary }]}>
                        {formatTimestamp(entry.created_at)}
                      </Text>
                      <Text style={[s.journalEntryText, { color: theme.text }]}>{entry.entry}</Text>
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          {/* ── Empty state when no plans exist ── */}
          {plans.length === 0 && view !== 'create' && (
            <View style={s.emptyState}>
              <Text style={s.emptyStateIcon}>🗺️</Text>
              <Text style={[s.emptyStateTitle, { color: theme.text }]}>No plans yet</Text>
              <Text style={s.emptyStateSub}>
                Create your first fitness plan with milestones and track your journey.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles (dynamic, themed)
// ─────────────────────────────────────────────

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 48 },

    header: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 16,
    },
    title: { color: theme.text, fontSize: 26, fontWeight: '900' },
    newBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
    newBtnText: { fontWeight: '700', fontSize: 14 },

    pillRow: { marginBottom: 16 },
    pillContent: { gap: 8, paddingRight: 20 },
    pill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
    pillText: { color: '#aaa', fontWeight: '600', fontSize: 13 },

    sectionTitle: {
      color: '#888', fontSize: 11, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginBottom: 12,
    },
    section: { marginBottom: 24 },

    // Plan card
    planCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 24 },
    planCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    planName: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
    planGoal: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
    planDate: { fontSize: 13, fontWeight: '600' },
    progressSub: { color: '#666', fontSize: 12, marginBottom: 4 },
    deleteLink: { color: '#ef4444', fontSize: 12, fontWeight: '600' },

    // Milestones
    milestoneRow: {
      flexDirection: 'row', alignItems: 'center',
      borderRadius: 12, borderWidth: 1,
      padding: 14, marginBottom: 8, gap: 12,
    },
    checkbox: {
      width: 24, height: 24, borderRadius: 12, borderWidth: 2,
      alignItems: 'center', justifyContent: 'center',
    },
    checkmark: { color: '#fff', fontSize: 13, fontWeight: '900' },
    milestoneText: { fontSize: 15, lineHeight: 21 },
    milestoneStrike: { textDecorationLine: 'line-through' },
    milestoneDoneAt: { color: '#555', fontSize: 11, marginTop: 2 },

    // Form
    fieldLabel: {
      color: '#888', fontSize: 11, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.6,
      marginBottom: 6, marginTop: 14,
    },
    input: { borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15 },
    inputMulti: { textAlignVertical: 'top', minHeight: 72 },
    milestoneInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    milestoneInput: { flex: 1 },
    addMilestoneBtn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
    addMilestoneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    draftMilestone: {
      flexDirection: 'row', alignItems: 'center',
      borderRadius: 10, borderWidth: 1,
      paddingVertical: 10, paddingHorizontal: 12,
      marginTop: 8, gap: 10,
    },
    draftMilestoneNum: { fontWeight: '800', fontSize: 13, width: 18, textAlign: 'center' },
    draftMilestoneText: { flex: 1, fontSize: 14 },
    removeBtn: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
    saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    cancelBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
    cancelBtnText: { fontSize: 15, fontWeight: '700' },

    // Journal
    journalInputWrap: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 12 },
    journalInput: { fontSize: 15, textAlignVertical: 'top', minHeight: 72, marginBottom: 10 },
    addEntryBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center', alignSelf: 'flex-end', paddingHorizontal: 20 },
    addEntryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    journalEntry: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
    journalEntryDate: { fontSize: 11, fontWeight: '700', marginBottom: 5 },
    journalEntryText: { fontSize: 14, lineHeight: 21 },

    emptyText: { color: '#555', fontSize: 14, fontStyle: 'italic' },
    dimmed: { opacity: 0.5 },

    // Empty state
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyStateIcon: { fontSize: 52, marginBottom: 16 },
    emptyStateTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
    emptyStateSub: { color: '#555', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  });
}
