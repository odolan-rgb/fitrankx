import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFitRankX } from '../../lib/store';
import { useTheme, ThemeColors } from '../../lib/theme';
import type { Gender, FitnessGoal, ActivityLevel } from '../../types';

const TOTAL_STEPS = 6;

const FITNESS_GOALS: { value: FitnessGoal; label: string; emoji: string }[] = [
  { value: 'lose',      label: 'Lose Weight',   emoji: '📉' },
  { value: 'gain',      label: 'Build Muscle',  emoji: '💪' },
  { value: 'maintain',  label: 'Maintain',      emoji: '⚖️' },
  { value: 'endurance', label: 'Endurance',     emoji: '🏃' },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary',   label: 'Sedentary',        desc: 'Little or no exercise' },
  { value: 'light',       label: 'Lightly Active',    desc: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderately Active', desc: '3–5 days/week' },
  { value: 'active',      label: 'Very Active',       desc: '6–7 days/week' },
  { value: 'very_active', label: 'Extremely Active',  desc: 'Twice a day or more' },
];

export default function OnboardingScreen() {
  const { updateProfile } = useFitRankX();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weight, setWeight] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);

  const isStepValid = () => {
    switch (step) {
      case 1: { const a = parseInt(age); return !isNaN(a) && a >= 13 && a <= 100; }
      case 2: return gender !== null;
      case 3: { const ft = parseInt(heightFt); return !isNaN(ft) && ft >= 1 && ft <= 8; }
      case 4: { const w = parseFloat(weight); return !isNaN(w) && w > 0 && w <= 1000; }
      case 5: return fitnessGoal !== null;
      case 6: return activityLevel !== null;
      default: return false;
    }
  };

  const handleNext = async () => {
    if (!isStepValid()) return;
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }
    await saveAndContinue();
  };

  const handleSkip = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      router.replace('/(tabs)/');
    }
  };

  const saveAndContinue = async () => {
    setLoading(true);
    setError('');
    const updates: Record<string, unknown> = {};
    if (age) updates.age = parseInt(age);
    if (gender) updates.gender = gender;
    if (heightFt) updates.height_ft = parseInt(heightFt);
    if (heightIn) updates.height_in = parseInt(heightIn) || 0;
    if (weight) updates.weight_lbs = parseFloat(weight);
    if (fitnessGoal) updates.fitness_goal = fitnessGoal;
    if (activityLevel) updates.activity_level = activityLevel;

    if (Object.keys(updates).length > 0) {
      await updateProfile(updates as Parameters<typeof updateProfile>[0]);
    }
    router.replace('/(tabs)/');
    setLoading(false);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>How old are you?</Text>
            <Text style={styles.stepSubtitle}>Helps us personalise your health stats.</Text>
            <TextInput
              style={styles.input}
              placeholder="Age"
              placeholderTextColor="#555"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={3}
            />
          </>
        );

      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>What's your gender?</Text>
            <Text style={styles.stepSubtitle}>Used for BMR calculations.</Text>
            {(['male', 'female', 'other'] as Gender[]).map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.optionButton, gender === g && { borderColor: theme.primary, backgroundColor: theme.card }]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.optionText, gender === g && { color: theme.primary }]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        );

      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>How tall are you?</Text>
            <Text style={styles.stepSubtitle}>Used for BMI and calorie estimates.</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Feet"
                placeholderTextColor="#555"
                value={heightFt}
                onChangeText={setHeightFt}
                keyboardType="number-pad"
                maxLength={1}
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Inches"
                placeholderTextColor="#555"
                value={heightIn}
                onChangeText={setHeightIn}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </>
        );

      case 4:
        return (
          <>
            <Text style={styles.stepTitle}>Current weight?</Text>
            <Text style={styles.stepSubtitle}>In lbs — you can update this anytime.</Text>
            <TextInput
              style={styles.input}
              placeholder="Weight (lbs)"
              placeholderTextColor="#555"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              maxLength={6}
            />
          </>
        );

      case 5:
        return (
          <>
            <Text style={styles.stepTitle}>What's your goal?</Text>
            <Text style={styles.stepSubtitle}>We'll tailor your calorie targets.</Text>
            {FITNESS_GOALS.map(g => (
              <TouchableOpacity
                key={g.value}
                style={[styles.optionButton, fitnessGoal === g.value && { borderColor: theme.primary, backgroundColor: theme.card }]}
                onPress={() => setFitnessGoal(g.value)}
              >
                <Text style={[styles.optionText, fitnessGoal === g.value && { color: theme.primary }]}>
                  {g.emoji}  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        );

      case 6:
        return (
          <>
            <Text style={styles.stepTitle}>How active are you?</Text>
            <Text style={styles.stepSubtitle}>Be honest — affects your TDEE estimate.</Text>
            {ACTIVITY_LEVELS.map(a => (
              <TouchableOpacity
                key={a.value}
                style={[styles.optionButton, activityLevel === a.value && { borderColor: theme.primary, backgroundColor: theme.card }]}
                onPress={() => setActivityLevel(a.value)}
              >
                <Text style={[styles.optionText, activityLevel === a.value && { color: theme.primary }]}>
                  {a.label}
                </Text>
                <Text style={styles.optionDesc}>{a.desc}</Text>
              </TouchableOpacity>
            ))}
          </>
        );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.logo}>FitRankX</Text>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` as any, backgroundColor: theme.primary }]} />
        </View>
        <Text style={styles.progressText}>Step {step} of {TOTAL_STEPS}</Text>
      </View>

      <View style={styles.stepContainer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {renderStep()}
      </View>

      {/* Skip link — always visible */}
      <TouchableOpacity onPress={handleSkip} style={styles.skipContainer}>
        <Text style={styles.skipText}>Skip for now →</Text>
      </TouchableOpacity>

      <View style={styles.navRow}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton,
            step === 1 && styles.nextButtonFull,
            !isStepValid() && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!isStepValid() || loading}
        >
          <Text style={styles.nextButtonText}>
            {loading ? 'Saving...' : step === TOTAL_STEPS ? 'Get Started!' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.bg,
      padding: 24,
      paddingTop: 64,
      paddingBottom: 40,
    },
    logo: {
      fontSize: 32,
      fontWeight: '900',
      color: theme.primary,
      marginBottom: 28,
      letterSpacing: 2,
      textAlign: 'center',
    },
    progressContainer: {
      marginBottom: 36,
    },
    progressBg: {
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      marginBottom: 8,
    },
    progressFill: {
      height: 4,
      borderRadius: 2,
    },
    progressText: {
      color: '#666',
      fontSize: 12,
      textAlign: 'right',
    },
    stepContainer: {
      flex: 1,
      marginBottom: 16,
    },
    stepTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 6,
    },
    stepSubtitle: {
      fontSize: 14,
      color: '#666',
      marginBottom: 24,
    },
    input: {
      width: '100%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      color: theme.text,
      fontSize: 16,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    inputHalf: {
      flex: 1,
      width: 'auto',
    },
    optionButton: {
      width: '100%',
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
    },
    optionText: {
      color: '#ccc',
      fontSize: 16,
      fontWeight: '600',
    },
    optionDesc: {
      color: '#666',
      fontSize: 13,
      marginTop: 3,
    },
    skipContainer: {
      alignItems: 'center',
      paddingVertical: 12,
      marginBottom: 4,
    },
    skipText: {
      color: '#555',
      fontSize: 14,
    },
    navRow: {
      flexDirection: 'row',
      gap: 12,
    },
    backButton: {
      flex: 1,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    backButtonText: {
      color: '#888',
      fontSize: 16,
      fontWeight: '700',
    },
    nextButton: {
      flex: 2,
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    nextButtonFull: {
      flex: 1,
    },
    nextButtonDisabled: {
      opacity: 0.4,
    },
    nextButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    error: {
      color: '#f87171',
      marginBottom: 16,
      fontSize: 14,
    },
  });
}
