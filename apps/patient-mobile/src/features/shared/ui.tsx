import { Link } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export function FeatureScreen({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {children}
    </ScrollView>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor="#526072" accessibilityLabel={props.accessibilityLabel} style={styles.input} {...props} />;
}

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled ? styles.buttonDisabled : null]}
      hitSlop={8}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.secondaryButton} hitSlop={8}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function StateBlock({
  isLoading,
  error,
  isEmpty,
  emptyText,
  success,
}: {
  isLoading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyText?: string;
  success?: ReactNode;
}) {
  if (isLoading) return <Text accessibilityLiveRegion="polite">Cargando información…</Text>;
  if (error) return <Text style={styles.errorText}>Ups, hubo un problema: {error}</Text>;
  if (isEmpty) return <Text>{emptyText ?? 'No hay información para mostrar.'}</Text>;
  return <>{success}</>;
}

export function NextStep({ to, label }: { to: string; label: string }) {
  return <Link href={to as never} style={styles.nextLink} accessibilityLabel={label}>{label}</Link>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f5fa' },
  content: { padding: 16, gap: 12 },
  title: { color: '#0d1b34', fontWeight: '800', fontSize: 24 },
  subtitle: { color: '#2a3b56', fontSize: 15, lineHeight: 21 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderColor: '#c7d5ea', borderWidth: 1, padding: 12, gap: 8 },
  sectionTitle: { color: '#0d1b34', fontWeight: '700', fontSize: 17 },
  label: { color: '#0d1b34', fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#7a8aa0', borderRadius: 10, paddingHorizontal: 12, color: '#0d1b34', backgroundColor: '#fff' },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#124ec6', borderRadius: 10, paddingHorizontal: 16 },
  buttonDisabled: { backgroundColor: '#90a3c4' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryButton: { minHeight: 48, borderWidth: 1, borderColor: '#124ec6', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryText: { color: '#124ec6', fontWeight: '700', fontSize: 16 },
  errorText: { color: '#8f1d1d', fontWeight: '600' },
  nextLink: { color: '#124ec6', textDecorationLine: 'underline', fontWeight: '700', minHeight: 44, paddingVertical: 8 },
});
