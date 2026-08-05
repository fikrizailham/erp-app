import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Pressable, Text } from 'react-native';
import { AuthProvider, useAuth } from '@/lib/auth';
import LoginScreen from '@/screens/LoginScreen';
import EnrollmentScreen from '@/screens/EnrollmentScreen';
import InvoicesScreen from '@/screens/InvoicesScreen';
import AttendanceScreen from '@/screens/AttendanceScreen';
import IncidentsScreen from '@/screens/IncidentsScreen';

const Tab = createBottomTabNavigator();

function AppShell() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#2E7D32" />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerRight: () => (
            <Pressable onPress={logout} style={{ marginRight: 16 }}>
              <Text style={{ color: '#2E7D32', fontWeight: '600' }}>Sign out</Text>
            </Pressable>
          ),
          tabBarActiveTintColor: '#2E7D32',
        }}
      >
        <Tab.Screen name="Enrollment" component={EnrollmentScreen} options={{ title: 'Enrollment' }} />
        <Tab.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Invoices' }} />
        <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
        <Tab.Screen name="Incidents" component={IncidentsScreen} options={{ title: 'Incidents' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppShell />
    </AuthProvider>
  );
}
