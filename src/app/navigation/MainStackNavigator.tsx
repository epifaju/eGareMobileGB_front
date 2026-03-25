import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LogoutButton from '@/features/auth/components/LogoutButton';
import MyReservationsScreen from '@/features/reservation/screens/MyReservationsScreen';
import SearchDestinationsScreen from '@/features/search/screens/SearchDestinationsScreen';
import HomeStationsScreen from '@/features/station/screens/HomeStationsScreen';
import LowBandwidthStationsScreen from '@/features/station/screens/LowBandwidthStationsScreen';
import StationsMapScreen from '@/features/station/screens/StationsMapScreen';
import DriverScanBoardingScreen from '@/features/vehicle/screens/DriverScanBoardingScreen';
import SeatMapScreen from '@/features/vehicle/screens/SeatMapScreen';
import StationVehiclesScreen from '@/features/vehicle/screens/StationVehiclesScreen';
import VehicleManifestScreen from '@/features/vehicle/screens/VehicleManifestScreen';
import VehicleRevenueScreen from '@/features/vehicle/screens/VehicleRevenueScreen';
import type { DriverStackParamList, PassengerStackParamList } from '@/app/navigation/navigationTypes';
import { colors } from '@/shared/constants/colors';
import { getAppRoleFromToken, isDriverOrAdminRole } from '@/shared/lib/jwtRole';

const PassengerStack = createNativeStackNavigator<PassengerStackParamList>();
const DriverStack = createNativeStackNavigator<DriverStackParamList>();
const Tab = createBottomTabNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#fff' as const,
  headerRight: () => <LogoutButton />,
};

function PassengerStackNavigator() {
  return (
    <PassengerStack.Navigator screenOptions={stackScreenOptions}>
      <PassengerStack.Screen name="Home" component={HomeStationsScreen} options={{ title: 'Gares' }} />
      <PassengerStack.Screen
        name="LowBandwidthStations"
        component={LowBandwidthStationsScreen}
        options={{ title: 'Réseau faible' }}
      />
      <PassengerStack.Screen
        name="SearchDestination"
        component={SearchDestinationsScreen}
        options={{ title: 'Recherche' }}
      />
      <PassengerStack.Screen name="StationsMap" component={StationsMapScreen} options={{ title: 'Carte' }} />
      <PassengerStack.Screen
        name="StationVehicles"
        component={StationVehiclesScreen}
        options={{ title: 'Véhicules' }}
      />
      <PassengerStack.Screen name="SeatMap" component={SeatMapScreen} options={{ title: 'Choix du siège' }} />
      <PassengerStack.Screen
        name="MyReservations"
        component={MyReservationsScreen}
        options={{ title: 'Mes réservations' }}
      />
      <PassengerStack.Screen
        name="DriverScanBoarding"
        component={DriverScanBoardingScreen}
        options={{ title: 'Scan embarquement', headerShown: false }}
      />
      <PassengerStack.Screen name="VehicleManifest" component={VehicleManifestScreen} options={{ title: 'Manifeste' }} />
      <PassengerStack.Screen name="VehicleRevenue" component={VehicleRevenueScreen} options={{ title: 'Revenus' }} />
    </PassengerStack.Navigator>
  );
}

function DriverStackNavigator() {
  return (
    <DriverStack.Navigator screenOptions={stackScreenOptions}>
      <DriverStack.Screen name="DriverHome" component={HomeStationsScreen} options={{ title: 'Conducteur' }} />
      <DriverStack.Screen
        name="LowBandwidthStations"
        component={LowBandwidthStationsScreen}
        options={{ title: 'Réseau faible' }}
      />
      <DriverStack.Screen name="StationsMap" component={StationsMapScreen} options={{ title: 'Carte' }} />
      <DriverStack.Screen
        name="StationVehicles"
        component={StationVehiclesScreen}
        options={{ title: 'Véhicules' }}
      />
      <DriverStack.Screen name="SeatMap" component={SeatMapScreen} options={{ title: 'Choix du siège' }} />
      <DriverStack.Screen
        name="DriverScanBoarding"
        component={DriverScanBoardingScreen}
        options={{ title: 'Scan embarquement', headerShown: false }}
      />
      <DriverStack.Screen name="VehicleManifest" component={VehicleManifestScreen} options={{ title: 'Manifeste' }} />
      <DriverStack.Screen name="VehicleRevenue" component={VehicleRevenueScreen} options={{ title: 'Revenus' }} />
    </DriverStack.Navigator>
  );
}

export default function MainStackNavigator() {
  const showDriverTab = isDriverOrAdminRole(getAppRoleFromToken());

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="VoyageurTab"
        component={PassengerStackNavigator}
        options={{ tabBarLabel: 'Voyageur' }}
      />
      {showDriverTab ? (
        <Tab.Screen
          name="ConducteurTab"
          component={DriverStackNavigator}
          options={{ tabBarLabel: 'Conducteur' }}
        />
      ) : null}
    </Tab.Navigator>
  );
}
