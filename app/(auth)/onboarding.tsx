import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFitRankX } from '../../lib/store';
import type { Gender, FitnessGoal, ActivityLevel } from '../../types';

const TOTAL_STEPS = 6;

const FITNESS_GOALS: { value: FitnessGoal; label: string; emoji: string }[] = [
  { value: 'lose',      label: 'Lose Weight',   emoji: '📉' },
  { value: 'gain',      label: 'Build Muscle',  emoji: '💪' },
  { value: 'maintain',  label: 'Maintain',      emoji: '⚖️' },
  { value: 'endurance', label: 'Endurance',     emoji: '🏃' },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary',   label: 'Sedentary',          desc: 'Little or no exercise' },
  { value: 'light',       label: 'Lightly Active',      desc: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderately Active',   desc: '3–5 days/week' },
  { value: 'active',      label: 'Very Active',         desc: '6–7 days/week' },
  { value: 'very_active', label: 'Extremely Active',    desc: 'Twice a day or more' },
];

export default function OnboardingScreen() {
  const { updateProfile } = useFitRankX();
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
    setLoading(true);
    setError('');
    await updateProfile({
      age: parseInt(age),
      gender: gender!,
      height_ft: parseInt(heightFt),
      height_in: parseInt(heightIn) || 0,
      weight_lbs: parseFloat(weight),
      fitness_goal: fitnessGoal!,
      activity_level: activityLevel!,
    });
    const storeError = useFitRankX.getState().error;
    if (storeError) {
      setError('Failed to save profile. Please try again.');
      setLoading(false);
      return;
    }
    router.replace('/(tabs)/');
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
            <TextInput
              style={styles.input}
              placeholder="Age"
              placeholderTextColor="#666"
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
            {(['male', 'female', 'other'] as Gender[]).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.optionButton, gender === g && styles.optionButtonSelected]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.optionText, gender === g && styles.optionTextSelected]}>
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
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Feet"
                placeholderTextColor="#666"
                value={heightFt}
                onChangeText={setHeightFt}
                keyboardType="number-pad"
                maxLength={1}
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Inches"
                placeholderTextColor="#666"
                value={heightIn}
                onChangeText={setHeightIn}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={styles.hint}>Enter feet and inches (e.g. 5 ft 10 in)</Text>
          </>
        );

      case 4:
        return (
          <>
            <Text style={styles.stepTitle}>What's your current weight?</Text>
            <TextInput
              style={styles.input}
              placeholder="Weight (lbs)"
              placeholderTextColor="#666"
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
            <Text style={styles.stepTitle}>What's your fitness goal?</Text>
            {FITNESS_GOALS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.optionButton, fitnessGoal === g.value && styles.optionButtonSelected]}
                onPress={() => setFitnessGoal(g.value)}
              >
                <Text style={[styles.optionText, fitnessGoal === g.value && styles.optionTextSelected]}>
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
            {ACTIVITY_LEVELS.map((a) => (
              <TouchableOpacity
                key={a.value}
                style={[styles.optionButton, activityLevel === a.value && styles.optionButtonSelected]}
                onPress={() => setActivityLevel(a.value)}
              >
                <Text style={[styles.optionText, activityLevel === a.value && styles.optionTextSelected]}>
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

      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` as any }]} />
        </View>
        <Text style={styles.progressText}>Step {step} of {TOTAL_STEPS}</Text>
      </View>

      <View style={styles.stepContainer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {renderStep()}
      </View>

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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#06001a',
    padding: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#a855f7',
    marginBottom: 28,
    letterSpacing: 2,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 36,
  },
  progressBg: {
    height: 4,
    backgroundColor: '#2d1a4a',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#a855f7',
    borderRadius: 2,
  },
  progressText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
  },
  stepContainer: {
    flex: 1,
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    backgroundColor: '#110020',
    borderWidth: 1,
    borderColor: '#2d1a4a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
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
  hint: {
    color: '#555',
    fontSize: 13,
    marginTop: -4,
  },
  optionButton: {
    width: '100%',
    backgroundColor: '#110020',
    borderWidth: 1,
    borderColor: '#2d1a4a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  optionButtonSelected: {
    borderColor: '#a855f7',
    backgroundColor: '#1e0040',
  },
  optionText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#a855f7',
  },
  optionDesc: {
    color: '#666',
    fontSize: 13,
    marginTop: 3,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#110020',
    borderWidth: 1,
    borderColor: '#2d1a4a',
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
    backgroundColor: '#a855f7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    backgroundColor: '#3d1a60',
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
