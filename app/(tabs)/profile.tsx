import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFitRankX } from '../../lib/store';
import { useTheme, AppTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import {
  THEMES, BADGE_DEFS,
  ACTIVITY_MULTIPLIERS, GOAL_CALORIE_ADJUSTMENTS,
  getRankForPts,
} from '../../constants/game';
import type { Gender, FitnessGoal, ActivityLevel } from '../../types';

// ─── Option data ───────────────────────────────────────────────────────────────

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
];

const GOAL_OPTIONS: { value: FitnessGoal; label: string }[] = [
  { value: 'lose',       label: 'Lose' },
  { value: 'maintain',   label: 'Maintain' },
  { value: 'gain',       label: 'Gain' },
  { value: 'endurance',  label: 'Endurance' },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary',   label: 'Sedentary' },
  { value: 'light',       label: 'Light' },
  { value: 'moderate',    label: 'Moderate' },
  { value: 'active',      label: 'Active' },
  { value: 'very_active', label: 'Very Active' },
];

const GOAL_NOTES: Record<FitnessGoal, string> = {
  lose:      'For fat loss',
  maintain:  'Maintenance',
  gain:      'For muscle gain',
  endurance: 'For endurance',
};

// BMI bar segments (range 10–40)
const BMI_SEGMENTS = [
  { label: 'Under',  flex: 17, color: '#60a5fa', active: (b: number) => b < 18.5 },
  { label: 'Normal', flex: 13, color: '#34d399', active: (b: number) => b >= 18.5 && b < 25 },
  { label: 'Over',   flex: 10, color: '#fbbf24', active: (b: number) => b >= 25 && b < 30 },
  { label: 'Obese',  flex: 20, color: '#ef4444', active: (b: number) => b >= 30 },
];

// ─── Health calculations ────────────────────────────────────────────────────────

function calcHealth(
  heightFt: string, heightIn: string, weightLbs: string,
  ageStr: string, gender: Gender | null,
  activityLevel: ActivityLevel | null, fitnessGoal: FitnessGoal | null,
) {
  const ft  = parseInt(heightFt)  || 0;
  const ins = parseInt(heightIn)  || 0;
  const wLbs = parseFloat(weightLbs) || 0;
  const age = parseInt(ageStr)    || 0;

  if ((ft === 0 && ins === 0) || wLbs === 0 || age === 0) return null;

  const heightCm = (ft * 12 + ins) * 2.54;
  const weightKg = wLbs * 0.453592;
  const bmi = weightKg / Math.pow(heightCm / 100, 2);

  let bmr: number;
  if (gender === 'male')   bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  else if (gender === 'female') bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  else                     bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;

  const actMult  = ACTIVITY_MULTIPLIERS[activityLevel ?? 'sedentary'];
  const goalAdj  = GOAL_CALORIE_ADJUSTMENTS[fitnessGoal ?? 'maintain'];
  const tdee     = bmr * actMult;
  const target   = tdee + goalAdj;

  return { bmi, bmr, tdee, target };
}

function getBmiCat(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: '#60a5fa' };
  if (bmi < 25)   return { label: 'Normal',      color: '#34d399' };
  if (bmi < 30)   return { label: 'Overweight',  color: '#fbbf24' };
  return               { label: 'Obese',         color: '#ef4444' };
}

// ─── OptionPicker ─────────────────────────────────────────────────────────────

type PickerProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T | null;
  onSelect: (v: T) => void;
  theme: AppTheme;
};

function OptionPicker<T extends string>({ options, value, onSelect, theme }: PickerProps<T>) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: active ? theme.primary : theme.border,
              backgroundColor: active ? theme.primary + '22' : theme.card,
            }}
          >
            <Text style={{
              color: active ? theme.primary : '#aaa',
              fontSize: 13,
              fontWeight: active ? '700' : '500',
            }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { profile, badges, updateProfile, loadBadges, reset } = useFitRankX();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme.theme]);

  // ── Biometrics form state
  const [age,           setAge]          = useState('');
  const [gender,        setGender]       = useState<Gender | null>(null);
  const [heightFt,      setHeightFt]     = useState('');
  const [heightIn,      setHeightIn]     = useState('');
  const [weightLbs,     setWeightLbs]    = useState('');
  const [fitnessGoal,   setFitnessGoal]  = useState<FitnessGoal | null>(null);
  const [actLevel,      setActLevel]     = useState<ActivityLevel | null>(null);
  const [saving,        setSaving]       = useState(false);
  const [saved,         setSaved]        = useState(false);

  // Sync form from profile on first load
  useEffect(() => {
    if (!profile) return;
    setAge(profile.age != null ? String(profile.age) : '');
    setGender(profile.gender ?? null);
    setHeightFt(profile.height_ft != null ? String(profile.height_ft) : '');
    setHeightIn(profile.height_in != null ? String(profile.height_in) : '');
    setWeightLbs(profile.weight_lbs != null ? String(profile.weight_lbs) : '');
    setFitnessGoal(profile.fitness_goal ?? null);
    setActLevel(profile.activity_level ?? null);
  }, [profile?.id]);

  useEffect(() => { loadBadges(); }, []);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      String(profile.age ?? '')          !== age       ||
      (profile.gender ?? null)            !== gender    ||
      String(profile.height_ft ?? '')    !== heightFt  ||
      String(profile.height_in ?? '')    !== heightIn  ||
      String(profile.weight_lbs ?? '')   !== weightLbs ||
      (profile.fitness_goal ?? null)     !== fitnessGoal ||
      (profile.activity_level ?? null)   !== actLevel
    );
  }, [profile, age, gender, heightFt, heightIn, weightLbs, fitnessGoal, actLevel]);

  const healthStats = useMemo(
    () => calcHealth(heightFt, heightIn, weightLbs, age, gender, actLevel, fitnessGoal),
    [heightFt, heightIn, weightLbs, age, gender, actLevel, fitnessGoal],
  );

  const rank       = profile ? getRankForPts(profile.pts) : null;
  const earnedKeys = useMemo(() => new Set(badges.map(b => b.badge_key)), [badges]);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      age:            parseInt(age)         || null,
      gender:         gender                ?? undefined,
      height_ft:      parseInt(heightFt)    || null,
      height_in:      parseInt(heightIn)    || 0,
      weight_lbs:     parseFloat(weightLbs) || null,
      fitness_goal:   fitnessGoal           ?? undefined,
      activity_level: actLevel              ?? undefined,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTheme = (t: typeof THEMES[0]) => updateProfile({ theme: t.theme });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my FitRankX squad! Use code: ${profile?.squad_code ?? '------'}`,
        title: 'FitRankX Squad Code',
      });
    } catch {}
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    reset();
    router.replace('/(auth)/login');
  };

  const bmiCat = healthStats ? getBmiCat(healthStats.bmi) : null;

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={s.headerCard}>
            <Text style={s.avatarText}>{profile?.avatar_emoji ?? '🏃'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.username}>{profile?.username ?? '...'}</Text>
              {rank && (
                <View style={[s.rankPill, { borderColor: rank.color, backgroundColor: rank.color + '22' }]}>
                  <Text style={[s.rankPillText, { color: rank.color }]}>
                    {rank.emoji} {rank.label}
                  </Text>
                </View>
              )}
              <Text style={s.ptsText}>{(profile?.pts ?? 0).toLocaleString()} pts</Text>
            </View>
          </View>

          {/* ── Biometrics ──────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>Biometrics</Text>
          <View style={s.card}>

            <Text style={s.fieldLabel}>Age</Text>
            <TextInput
              style={s.input}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={theme.dimmed}
              maxLength={3}
            />

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>Gender</Text>
            <OptionPicker options={GENDER_OPTIONS} value={gender} onSelect={setGender} theme={theme} />

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>Height</Text>
            <View style={s.heightRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={heightFt}
                onChangeText={setHeightFt}
                keyboardType="numeric"
                placeholder="ft"
                placeholderTextColor={theme.dimmed}
                maxLength={1}
              />
              <Text style={s.unitLabel}>ft</Text>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={heightIn}
                onChangeText={setHeightIn}
                keyboardType="numeric"
                placeholder="in"
                placeholderTextColor={theme.dimmed}
                maxLength={2}
              />
              <Text style={s.unitLabel}>in</Text>
            </View>

            <Text style={s.fieldLabel}>Weight (lbs)</Text>
            <TextInput
              style={s.input}
              value={weightLbs}
              onChangeText={setWeightLbs}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={theme.dimmed}
              maxLength={6}
            />

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>Fitness Goal</Text>
            <OptionPicker options={GOAL_OPTIONS} value={fitnessGoal} onSelect={setFitnessGoal} theme={theme} />

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>Activity Level</Text>
            <OptionPicker options={ACTIVITY_OPTIONS} value={actLevel} onSelect={setActLevel} theme={theme} />

            {(hasChanges || saving || saved) && (
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={s.saveBtnText}>
                  {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Health Stats ────────────────────────────────────────── */}
          {healthStats && (
            <>
              <Text style={s.sectionLabel}>Health Stats</Text>
              <View style={s.statsGrid}>

                {/* BMI */}
                <View style={[s.statCard, s.halfCard]}>
                  <Text style={s.statLabel}>BMI</Text>
                  <Text style={[s.statValue, { color: bmiCat!.color }]}>
                    {healthStats.bmi.toFixed(1)}
                  </Text>
                  <Text style={[s.statSub, { color: bmiCat!.color }]}>{bmiCat!.label}</Text>
                  <View style={s.bmiBar}>
                    {BMI_SEGMENTS.map(seg => (
                      <View
                        key={seg.label}
                        style={[
                          { flex: seg.flex, backgroundColor: seg.color },
                          s.bmiSeg,
                          seg.active(healthStats.bmi) && s.bmiSegActive,
                        ]}
                      />
                    ))}
                  </View>
                  <View style={s.bmiRowLabels}>
                    {['10', '18.5', '25', '30', '40'].map(l => (
                      <Text key={l} style={s.bmiRowLabel}>{l}</Text>
                    ))}
                  </View>
                </View>

                {/* BMR */}
                <View style={[s.statCard, s.halfCard]}>
                  <Text style={s.statLabel}>BMR</Text>
                  <Text style={s.statValue}>{Math.round(healthStats.bmr).toLocaleString()}</Text>
                  <Text style={s.statSub}>kcal / day</Text>
                  <Text style={s.statNote}>Resting rate</Text>
                </View>

                {/* TDEE */}
                <View style={[s.statCard, s.halfCard]}>
                  <Text style={s.statLabel}>TDEE</Text>
                  <Text style={s.statValue}>{Math.round(healthStats.tdee).toLocaleString()}</Text>
                  <Text style={s.statSub}>kcal / day</Text>
                  <Text style={s.statNote}>With activity</Text>
                </View>

                {/* Target */}
                <View style={[s.statCard, s.halfCard]}>
                  <Text style={s.statLabel}>Target</Text>
                  <Text style={[s.statValue, { color: theme.primary }]}>
                    {Math.round(healthStats.target).toLocaleString()}
                  </Text>
                  <Text style={s.statSub}>kcal / day</Text>
                  <Text style={s.statNote}>{GOAL_NOTES[fitnessGoal ?? 'maintain']}</Text>
                </View>

              </View>
            </>
          )}

          {/* ── Theme ───────────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>Theme</Text>
          <View style={s.card}>
            <View style={s.themeRow}>
              {THEMES.map(t => {
                const active = profile?.theme === t.theme;
                return (
                  <TouchableOpacity
                    key={t.theme}
                    onPress={() => handleTheme(t)}
                    style={[
                      s.themeCircle,
                      { backgroundColor: t.primary },
                      active && s.themeCircleActive,
                    ]}
                  >
                    <Text style={s.themeEmoji}>{t.emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[s.themeName, { color: theme.primary }]}>
              {THEMES.find(t => t.theme === profile?.theme)?.label ?? 'Nova'}
            </Text>
          </View>

          {/* ── Badges ──────────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>Badges</Text>
          <View style={s.card}>
            <View style={s.badgeGrid}>
              {BADGE_DEFS.map(b => {
                const earned = earnedKeys.has(b.key);
                return (
                  <View key={b.key} style={[s.badgeCell, !earned && s.badgeLocked]}>
                    <Text style={s.badgeEmoji}>{earned ? b.emoji : '🔒'}</Text>
                    <Text style={[s.badgeName, !earned && { color: theme.dimmed }]} numberOfLines={1}>
                      {b.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Squad Code ──────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>Squad</Text>
          <View style={s.card}>
            <Text style={s.squadSubLabel}>Your Squad Code</Text>
            <Text style={[s.squadCode, { color: theme.primary }]}>
              {profile?.squad_code ?? '------'}
            </Text>
            <Text style={s.squadHint}>Share this code so friends can find your squad</Text>
            <TouchableOpacity
              style={[s.shareBtn, { backgroundColor: theme.primary }]}
              onPress={handleShare}
            >
              <Text style={s.shareBtnText}>📤  Share Code</Text>
            </TouchableOpacity>
          </View>

          {/* ── Sign Out ────────────────────────────────────────────── */}
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles factory ────────────────────────────────────────────────────────────

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: t.bg },
    content: { padding: 20, paddingBottom: 48 },

    // Header card
    headerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      backgroundColor: t.card,
      borderRadius: 18,
      padding: 20,
      marginBottom: 26,
      borderWidth: 1,
      borderColor: t.border,
    },
    avatarText: { fontSize: 52 },
    username:   { color: t.text, fontSize: 22, fontWeight: '900', marginBottom: 6 },
    rankPill: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      marginBottom: 6,
    },
    rankPillText: { fontSize: 13, fontWeight: '700' },
    ptsText: { color: t.muted, fontSize: 13 },

    // Section label
    sectionLabel: {
      color: t.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 10,
      marginTop: 2,
    },

    // Card
    card: {
      backgroundColor: t.card,
      borderRadius: 16,
      padding: 18,
      marginBottom: 22,
      borderWidth: 1,
      borderColor: t.border,
    },

    // Form inputs
    fieldLabel: {
      color: t.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    input: {
      backgroundColor: t.bg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      color: t.text,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 11,
      marginBottom: 4,
    },
    heightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    unitLabel: { color: t.muted, fontSize: 14, width: 18 },

    saveBtn: {
      marginTop: 18,
      backgroundColor: t.primary,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

    // Stats grid
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 22,
    },
    statCard: {
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: t.border,
    },
    halfCard: { width: '47.5%' },
    statLabel: {
      color: t.muted,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    statValue: { color: t.text, fontSize: 26, fontWeight: '900', lineHeight: 30 },
    statSub:   { color: t.muted, fontSize: 11, marginTop: 3 },
    statNote:  { color: t.dimmed, fontSize: 11, marginTop: 8 },

    // BMI bar
    bmiBar: {
      flexDirection: 'row',
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      marginTop: 10,
      gap: 1,
    },
    bmiSeg:       { opacity: 0.3 },
    bmiSegActive: { opacity: 1 },
    bmiRowLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 3,
    },
    bmiRowLabel: { color: t.dimmed, fontSize: 8 },

    // Theme
    themeRow: { flexDirection: 'row', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
    themeCircle: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    themeCircleActive: {
      borderWidth: 3,
      borderColor: '#ffffff',
    },
    themeEmoji: { fontSize: 22 },
    themeName:  { fontSize: 13, fontWeight: '700' },

    // Badges
    badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badgeCell: {
      width: '29.5%',
      alignItems: 'center',
      backgroundColor: t.bg,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: t.border,
    },
    badgeLocked: { opacity: 0.35 },
    badgeEmoji: { fontSize: 26, marginBottom: 4 },
    badgeName:  { color: t.text, fontSize: 10, fontWeight: '600', textAlign: 'center' },

    // Squad
    squadSubLabel: { color: t.muted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
    squadCode: {
      fontSize: 32,
      fontWeight: '900',
      letterSpacing: 6,
      marginBottom: 8,
    },
    squadHint: { color: t.dimmed, fontSize: 12, marginBottom: 16 },
    shareBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
    shareBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

    // Sign out
    signOutBtn: {
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 4,
    },
    signOutText: { color: t.muted, fontWeight: '700', fontSize: 14 },
  });
}
