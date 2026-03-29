import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

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
import type {
  AgentStackParamList,
  DriverStackParamList,
  PassengerStackParamList,
} from '@/app/navigation/navigationTypes';
import { colors } from '@/shared/constants/colors';
import AdminStackNavigator from '@/features/admin/navigation/AdminStackNavigator';
import { getAppRoleFromToken, isAdminRole, isAgentRole, isDriverOrAdminRole } from '@/shared/lib/jwtRole';

const PassengerStack = createNativeStackNavigator<PassengerStackParamList>();
const DriverStack = createNativeStackNavigator<DriverStackParamList>();
const AgentStack = createNativeStackNavigator<AgentStackParamList>();
const Tab = createBottomTabNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#fff' as const,
  headerRight: () => <LogoutButton />,
};

function PassengerStackNavigator() {
  const { t } = useTranslation();
  return (
    <PassengerStack.Navigator screenOptions={stackScreenOptions}>
      <PassengerStack.Screen name="Home" component={HomeStationsScreen} options={{ title: t('nav.stations') }} />
      <PassengerStack.Screen
        name="LowBandwidthStations"
        component={LowBandwidthStationsScreen}
        options={{ title: t('nav.lowBandwidth') }}
      />
      <PassengerStack.Screen
        name="SearchDestination"
        component={SearchDestinationsScreen}
        options={{ title: t('nav.search') }}
      />
      <PassengerStack.Screen name="StationsMap" component={StationsMapScreen} options={{ title: t('nav.map') }} />
      <PassengerStack.Screen
        name="StationVehicles"
        component={StationVehiclesScreen}
        options={{ title: t('nav.vehicles') }}
      />
      <PassengerStack.Screen name="SeatMap" component={SeatMapScreen} options={{ title: t('nav.seatChoice') }} />
      <PassengerStack.Screen
        name="MyReservations"
        component={MyReservationsScreen}
        options={{ title: t('nav.myReservations') }}
      />
      <PassengerStack.Screen
        name="DriverScanBoarding"
        component={DriverScanBoardingScreen}
        options={{ title: t('nav.scanBoarding'), headerShown: false }}
      />
      <PassengerStack.Screen name="VehicleManifest" component={VehicleManifestScreen} options={{ title: t('nav.manifest') }} />
      <PassengerStack.Screen name="VehicleRevenue" component={VehicleRevenueScreen} options={{ title: t('nav.revenue') }} />
    </PassengerStack.Navigator>
  );
}

function AgentStackNavigator() {
  const { t } = useTranslation();
  return (
    <AgentStack.Navigator screenOptions={stackScreenOptions}>
      <AgentStack.Screen name="AgentHome" component={HomeStationsScreen} options={{ title: t('nav.agent') }} />
      <AgentStack.Screen
        name="LowBandwidthStations"
        component={LowBandwidthStationsScreen}
        options={{ title: t('nav.lowBandwidth') }}
      />
      <AgentStack.Screen name="StationsMap" component={StationsMapScreen} options={{ title: t('nav.map') }} />
      <AgentStack.Screen
        name="StationVehicles"
        component={StationVehiclesScreen}
        options={{ title: t('nav.vehicles') }}
      />
      <AgentStack.Screen name="SeatMap" component={SeatMapScreen} options={{ title: t('nav.seatChoice') }} />
      <AgentStack.Screen
        name="DriverScanBoarding"
        component={DriverScanBoardingScreen}
        options={{ title: t('nav.scanBoarding'), headerShown: false }}
      />
      <AgentStack.Screen name="VehicleManifest" component={VehicleManifestScreen} options={{ title: t('nav.manifest') }} />
      <AgentStack.Screen name="VehicleRevenue" component={VehicleRevenueScreen} options={{ title: t('nav.revenue') }} />
    </AgentStack.Navigator>
  );
}

function DriverStackNavigator() {
  const { t } = useTranslation();
  return (
    <DriverStack.Navigator screenOptions={stackScreenOptions}>
      <DriverStack.Screen name="DriverHome" component={HomeStationsScreen} options={{ title: t('nav.driver') }} />
      <DriverStack.Screen
        name="LowBandwidthStations"
        component={LowBandwidthStationsScreen}
        options={{ title: t('nav.lowBandwidth') }}
      />
      <DriverStack.Screen name="StationsMap" component={StationsMapScreen} options={{ title: t('nav.map') }} />
      <DriverStack.Screen
        name="StationVehicles"
        component={StationVehiclesScreen}
        options={{ title: t('nav.vehicles') }}
      />
      <DriverStack.Screen name="SeatMap" component={SeatMapScreen} options={{ title: t('nav.seatChoice') }} />
      <DriverStack.Screen
        name="DriverScanBoarding"
        component={DriverScanBoardingScreen}
        options={{ title: t('nav.scanBoarding'), headerShown: false }}
      />
      <DriverStack.Screen name="VehicleManifest" component={VehicleManifestScreen} options={{ title: t('nav.manifest') }} />
      <DriverStack.Screen name="VehicleRevenue" component={VehicleRevenueScreen} options={{ title: t('nav.revenue') }} />
    </DriverStack.Navigator>
  );
}

export default function MainStackNavigator() {
  const { t } = useTranslation();
  const role = getAppRoleFromToken();
  const showAgentTab = isAgentRole(role);
  const showDriverTab = isDriverOrAdminRole(role);
  const showAdminTab = isAdminRole(role);

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
        options={{ tabBarLabel: t('nav.traveler') }}
      />
      {showAgentTab ? (
        <Tab.Screen name="AgentTab" component={AgentStackNavigator} options={{ tabBarLabel: t('nav.stationOps') }} />
      ) : null}
      {showDriverTab ? (
        <Tab.Screen
          name="ConducteurTab"
          component={DriverStackNavigator}
          options={{ tabBarLabel: t('nav.driver') }}
        />
      ) : null}
      {showAdminTab ? (
        <Tab.Screen name="AdminTab" component={AdminStackNavigator} options={{ tabBarLabel: t('nav.admin') }} />
      ) : null}
    </Tab.Navigator>
  );
}
