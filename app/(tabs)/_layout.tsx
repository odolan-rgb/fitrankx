import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { useFitRankX } from '../../lib/store';
import { BadgeDef } from '../../constants/game';

// ─── Badge Toast ──────────────────────────────

function BadgeToast({ badge, onDismiss }: { badge: BadgeDef; onDismiss: () => void }) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { theme } = useTheme();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -120, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 3500);

    return () => clearTimeout(timer);
  }, [badge.key]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { borderColor: theme.primary, backgroundColor: theme.card, transform: [{ translateY }], opacity },
      ]}
    >
      <TouchableOpacity style={styles.toastInner} activeOpacity={0.9} onPress={onDismiss}>
        <Text style={styles.toastEmoji}>{badge.emoji}</Text>
        <View style={styles.toastText}>
          <Text style={[styles.toastHeading, { color: theme.primary }]}>🏅 Badge unlocked!</Text>
          <Text style={styles.toastName}>{badge.name}</Text>
          <Text style={styles.toastDesc}>{badge.description}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Layout ───────────────────────────────────

export default function TabsLayout() {
  const { theme } = useTheme();
  const pendingBadges = useFitRankX((s) => s.pendingBadges);
  const clearPendingBadges = useFitRankX((s) => s.clearPendingBadges);
  const currentBadge = pendingBadges[0] ?? null;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            borderTopWidth: 1,
            height: 80,
            paddingBottom: 20,
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: '#555',
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
        <Tabs.Screen name="leaderboard" options={{ title: 'Ranks', tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} /> }} />
        <Tabs.Screen name="battle" options={{ title: 'Battle', tabBarIcon: ({ color, size }) => <Ionicons name="flash" color={color} size={size} /> }} />
        <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ color, size }) => <Ionicons name="map" color={color} size={size} /> }} />
        <Tabs.Screen name="weight" options={{ title: 'Weight', tabBarIcon: ({ color, size }) => <Ionicons name="scale" color={color} size={size} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
      </Tabs>

      {currentBadge && (
        <BadgeToast badge={currentBadge} onDismiss={clearPendingBadges} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 999,
    borderRadius: 16,
    borderWidth: 1,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toastInner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  toastEmoji: { fontSize: 36 },
  toastText: { flex: 1 },
  toastHeading: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  toastName: { color: '#fff', fontSize: 16, fontWeight: '900' },
  toastDesc: { color: '#aaa', fontSize: 12, marginTop: 2 },
});
