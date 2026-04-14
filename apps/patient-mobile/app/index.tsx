import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SCREENS } from '../src/config/screens';

export default function HomeIndex() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Portal Paciente · Rutas SC-01..SC-32</Text>
      <View style={styles.grid}>
        {SCREENS.map((screen) => (
          <Link key={screen.id} href={`/sc/${screen.id.toLowerCase()}` as never} style={styles.link}>
            {screen.id} · {screen.title}
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  grid: { gap: 8 },
  link: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe4f2', padding: 10, borderRadius: 8 },
});
