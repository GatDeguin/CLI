import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type MainTab = 'Inicio' | 'Turnos' | 'Cartilla' | 'Resultados' | 'Mi cuenta';

type ScreenDef = {
  id: string;
  tab: MainTab;
  title: string;
  microcopy: string;
};

const SCREENS: ScreenDef[] = [
  { id: 'SC-01', tab: 'Inicio', title: 'Bienvenida', microcopy: 'Hola 👋, gestioná tu salud en pocos pasos.' },
  { id: 'SC-02', tab: 'Mi cuenta', title: 'Registro', microcopy: 'Completá tus datos para crear tu cuenta.' },
  { id: 'SC-03', tab: 'Mi cuenta', title: 'Validación OTP', microcopy: 'Ingresá el código de 6 dígitos que te enviamos.' },
  { id: 'SC-04', tab: 'Mi cuenta', title: 'Login', microcopy: 'Ingresá con DNI o email y tu contraseña.' },
  { id: 'SC-05', tab: 'Inicio', title: 'Dashboard de salud', microcopy: 'Tus próximos turnos, documentos y novedades.' },
  { id: 'SC-06', tab: 'Turnos', title: 'Buscar especialidad', microcopy: 'Elegí especialidad, modalidad y cobertura.' },
  { id: 'SC-07', tab: 'Turnos', title: 'Seleccionar profesional', microcopy: 'Encontrá disponibilidad por profesional.' },
  { id: 'SC-08', tab: 'Turnos', title: 'Seleccionar agenda', microcopy: 'Elegí fecha y horario de atención.' },
  { id: 'SC-09', tab: 'Turnos', title: 'Confirmar reserva', microcopy: 'Revisá los datos antes de confirmar tu turno.' },
  { id: 'SC-10', tab: 'Turnos', title: 'Pago de copago', microcopy: 'Pagá de forma segura para finalizar la reserva.' },
  { id: 'SC-11', tab: 'Turnos', title: 'Reserva exitosa', microcopy: '¡Listo! Tu turno quedó confirmado.' },
  { id: 'SC-12', tab: 'Turnos', title: 'Mis turnos', microcopy: 'Consultá próximos turnos e historial.' },
  { id: 'SC-13', tab: 'Turnos', title: 'Detalle de turno', microcopy: 'Accedé a indicaciones, ubicación y estado.' },
  { id: 'SC-14', tab: 'Turnos', title: 'Reprogramar turno', microcopy: 'Elegí un nuevo horario disponible.' },
  { id: 'SC-15', tab: 'Turnos', title: 'Cancelar turno', microcopy: '¿Seguro? Podés cancelar sin costo según política.' },
  { id: 'SC-16', tab: 'Cartilla', title: 'Cartilla médica', microcopy: 'Buscá prestadores por zona y cobertura.' },
  { id: 'SC-17', tab: 'Cartilla', title: 'Detalle de prestador', microcopy: 'Conocé dirección, prácticas y valoraciones.' },
  { id: 'SC-18', tab: 'Cartilla', title: 'Favoritos', microcopy: 'Guardá profesionales para acceso rápido.' },
  { id: 'SC-19', tab: 'Resultados', title: 'Resultados de estudios', microcopy: 'Visualizá y descargá tus informes.' },
  { id: 'SC-20', tab: 'Resultados', title: 'Detalle de resultado', microcopy: 'Resumen clínico y archivos adjuntos.' },
  { id: 'SC-21', tab: 'Resultados', title: 'Documentos', microcopy: 'Recetas, órdenes y certificados en un solo lugar.' },
  { id: 'SC-22', tab: 'Resultados', title: 'Compartir documento', microcopy: 'Compartí por mail o descargá en PDF.' },
  { id: 'SC-23', tab: 'Mi cuenta', title: 'Perfil personal', microcopy: 'Actualizá datos de contacto y domicilio.' },
  { id: 'SC-24', tab: 'Mi cuenta', title: 'Credencial digital', microcopy: 'Mostrá tu credencial desde el celular.' },
  { id: 'SC-25', tab: 'Mi cuenta', title: 'Medios de pago', microcopy: 'Administrá tarjetas para copagos.' },
  { id: 'SC-26', tab: 'Mi cuenta', title: 'Notificaciones', microcopy: 'Configurá recordatorios y avisos importantes.' },
  { id: 'SC-27', tab: 'Mi cuenta', title: 'Grupo familiar', microcopy: 'Agregá y gestioná integrantes autorizados.' },
  { id: 'SC-28', tab: 'Mi cuenta', title: 'Alta integrante', microcopy: 'Ingresá DNI y vínculo del familiar.' },
  { id: 'SC-29', tab: 'Mi cuenta', title: 'Cambiar titular activo', microcopy: 'Operá turnos y documentos por cada integrante.' },
  { id: 'SC-30', tab: 'Inicio', title: 'Ayuda y soporte', microcopy: 'Estamos para ayudarte por chat o teléfono.' },
  { id: 'SC-31', tab: 'Mi cuenta', title: 'Seguridad de cuenta', microcopy: 'Cambiá contraseña y cerrá sesiones abiertas.' },
  { id: 'SC-32', tab: 'Inicio', title: 'Estado de servicios', microcopy: 'Revisá disponibilidad de turnos, pagos y resultados.' },
];

const TABS: MainTab[] = ['Inicio', 'Turnos', 'Cartilla', 'Resultados', 'Mi cuenta'];

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('Inicio');
  const [screenId, setScreenId] = useState<string>('SC-01');

  const [registered, setRegistered] = useState(false);
  const [otpValidated, setOtpValidated] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [reserved, setReserved] = useState(false);
  const [paid, setPaid] = useState(false);
  const [familyLinked, setFamilyLinked] = useState(false);

  const visibleScreens = useMemo(
    () => SCREENS.filter((screen) => screen.tab === activeTab),
    [activeTab],
  );
  const selected = SCREENS.find((item) => item.id === screenId) ?? SCREENS[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.appTitle}>Portal Paciente</Text>
        <Text style={styles.subtitle}>Navegación principal + prototipo de flujos críticos</Text>

        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.activeTab]}>
              <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {visibleScreens.map((screen) => (
            <Pressable key={screen.id} onPress={() => setScreenId(screen.id)} style={[styles.chip, screen.id === selected.id && styles.activeChip]}>
              <Text style={styles.chipLabel}>{screen.id}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.card}>
          <Text style={styles.screenTitle}>{selected.id} · {selected.title}</Text>
          <Text style={styles.microcopy}>{selected.microcopy}</Text>

          {selected.id === 'SC-02' && (
            <FlowAction label={registered ? 'Registro completo ✅' : 'Completar registro'} onPress={() => setRegistered(true)} />
          )}
          {selected.id === 'SC-03' && (
            <FlowAction label={otpValidated ? 'OTP validado ✅' : 'Validar OTP'} onPress={() => setOtpValidated(true)} />
          )}
          {selected.id === 'SC-04' && (
            <FlowAction
              label={loggedIn ? 'Sesión iniciada ✅' : 'Iniciar sesión'}
              onPress={() => setLoggedIn(registered && otpValidated)}
              disabled={!registered || !otpValidated}
              helperText={!registered || !otpValidated ? 'Primero completá SC-02 y SC-03.' : undefined}
            />
          )}
          {selected.id === 'SC-09' && (
            <FlowAction label={reserved ? 'Reserva confirmada ✅' : 'Confirmar reserva'} onPress={() => setReserved(true)} disabled={!loggedIn} helperText={!loggedIn ? 'Necesitás iniciar sesión.' : undefined} />
          )}
          {selected.id === 'SC-10' && (
            <FlowAction label={paid ? 'Pago acreditado ✅' : 'Pagar copago'} onPress={() => setPaid(reserved)} disabled={!reserved} helperText={!reserved ? 'Primero confirmá la reserva (SC-09).' : undefined} />
          )}
          {selected.id === 'SC-27' && (
            <FlowAction label={familyLinked ? 'Grupo familiar activo ✅' : 'Vincular integrante'} onPress={() => setFamilyLinked(true)} disabled={!loggedIn} helperText={!loggedIn ? 'Iniciá sesión para operar grupo familiar.' : undefined} />
          )}

          {(selected.id === 'SC-12' || selected.id === 'SC-19' || selected.id === 'SC-21') && (
            <View style={styles.mockBox}>
              <Text style={styles.mockTitle}>Estado del flujo</Text>
              <Text style={styles.mockLine}>Login: {loggedIn ? 'Activo' : 'Pendiente'}</Text>
              <Text style={styles.mockLine}>Reserva: {reserved ? 'Confirmada' : 'Pendiente'}</Text>
              <Text style={styles.mockLine}>Pago: {paid ? 'Acreditado' : 'Pendiente'}</Text>
              <Text style={styles.mockLine}>Grupo familiar: {familyLinked ? 'Vinculado' : 'Sin vincular'}</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function FlowAction({
  label,
  onPress,
  disabled,
  helperText,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <View style={styles.flowSection}>
      <Pressable style={[styles.flowButton, disabled && styles.flowButtonDisabled]} onPress={onPress} disabled={disabled}>
        <Text style={styles.flowButtonLabel}>{label}</Text>
      </Pressable>
      {helperText && <Text style={styles.helperText}>{helperText}</Text>}
      <TextInput editable={false} style={styles.fakeInput} value="Demo de prototipo funcional para validación." />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6FB' },
  container: { flex: 1, padding: 16, gap: 12 },
  appTitle: { fontSize: 26, fontWeight: '700', color: '#12233D' },
  subtitle: { color: '#4B5D78' },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#E9EEF8', borderRadius: 999 },
  activeTab: { backgroundColor: '#1C5FD4' },
  tabLabel: { color: '#17325C', fontWeight: '600' },
  activeTabLabel: { color: '#FFFFFF' },
  chipsRow: { maxHeight: 38 },
  chip: { marginRight: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE4F2' },
  activeChip: { backgroundColor: '#CDE0FF', borderColor: '#1C5FD4' },
  chipLabel: { fontWeight: '600', color: '#20406C' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: '#DCE4F2' },
  screenTitle: { fontSize: 18, fontWeight: '700', color: '#12233D' },
  microcopy: { color: '#324B6E', fontSize: 15 },
  flowSection: { gap: 8 },
  flowButton: { backgroundColor: '#1C5FD4', borderRadius: 8, padding: 12 },
  flowButtonDisabled: { backgroundColor: '#93ACD8' },
  flowButtonLabel: { color: '#FFFFFF', textAlign: 'center', fontWeight: '700' },
  helperText: { color: '#A14F19', fontSize: 12 },
  fakeInput: { borderWidth: 1, borderColor: '#DCE4F2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: '#678' },
  mockBox: { backgroundColor: '#F8FAFF', borderRadius: 8, padding: 10, gap: 2 },
  mockTitle: { fontWeight: '700', color: '#17325C' },
  mockLine: { color: '#335070' },
});
