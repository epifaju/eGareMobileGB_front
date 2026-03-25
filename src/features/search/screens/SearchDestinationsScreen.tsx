import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { PassengerStackParamList } from '@/app/navigation/navigationTypes';
import { useLazyGetDestinationSuggestionsQuery, useLazySearchVehiclesQuery } from '@/features/search/api/searchApi';
import { searchFiltersStorage } from '@/features/search/lib/searchFiltersStorage';
import type { SearchVehiclesParams } from '@/features/search/types';
import { useGetStationsQuery } from '@/features/station/api/stationApi';
import type { Vehicle, VehicleStatus } from '@/features/vehicle/types';
import { getAppRoleFromToken } from '@/shared/lib/jwtRole';
import { parseApiError } from '@/shared/utils/apiError';

const STATUS_LABEL: Record<VehicleStatus, string> = {
  EN_FILE: 'En file',
  REMPLISSAGE: 'Remplissage',
  COMPLET: 'Complet',
  PARTI: 'Parti',
};

const STATUS_OPTIONS: VehicleStatus[] = ['EN_FILE', 'REMPLISSAGE', 'COMPLET', 'PARTI'];
const SORT_OPTIONS = [
  { id: 'departureScheduledAt,asc', label: 'Départ ↑' },
  { id: 'departureScheduledAt,desc', label: 'Départ ↓' },
  { id: 'fareAmountXof,asc', label: 'Tarif ↑' },
  { id: 'fareAmountXof,desc', label: 'Tarif ↓' },
] as const;

function formatDeparture(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '—';
  }
}

export type SearchDestinationsScreenProps = NativeStackScreenProps<
  PassengerStackParamList,
  'SearchDestination'
>;

export default function SearchDestinationsScreen({
  navigation,
  testID = 'screen-search-destination',
}: SearchDestinationsScreenProps & { testID?: string }) {
  const [destinationQ, setDestinationQ] = useState('');
  const [suggestions, setSuggestions] = useState<{ label: string }[]>([]);
  const [stationId, setStationId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | undefined>(undefined);
  const [minFare, setMinFare] = useState('');
  const [maxFare, setMaxFare] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [departurePreset, setDeparturePreset] = useState<'none' | 'next2h' | 'next6h' | 'today'>('none');
  const [departureFromMinutes, setDepartureFromMinutes] = useState('');
  const [departureToMinutes, setDepartureToMinutes] = useState('');
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['id']>('departureScheduledAt,asc');
  const [hasSearched, setHasSearched] = useState(false);

  const { data: stationsPage } = useGetStationsQuery({ page: 0, size: 100 });
  const stations = stationsPage?.page.content ?? [];

  const [triggerSuggest, suggestState] = useLazyGetDestinationSuggestionsQuery();
  const [triggerSearch, searchState] = useLazySearchVehiclesQuery();

  const canReserve = getAppRoleFromToken() === 'USER';

  useEffect(() => {
    const persisted = searchFiltersStorage.read();
    if (!persisted) {
      return;
    }
    setStationId(persisted.stationId);
    setStatusFilter(persisted.statusFilter);
    setMinFare(persisted.minFare ?? '');
    setMaxFare(persisted.maxFare ?? '');
    setActiveOnly(persisted.activeOnly);
    setDeparturePreset(persisted.departurePreset);
    setDepartureFromMinutes(persisted.departureFromMinutes ?? '');
    setDepartureToMinutes(persisted.departureToMinutes ?? '');
    setSort(persisted.sort);
  }, []);

  useEffect(() => {
    searchFiltersStorage.write({
      stationId,
      statusFilter,
      minFare,
      maxFare,
      activeOnly,
      departurePreset,
      departureFromMinutes,
      departureToMinutes,
      sort,
    });
  }, [
    stationId,
    statusFilter,
    minFare,
    maxFare,
    activeOnly,
    departurePreset,
    departureFromMinutes,
    departureToMinutes,
    sort,
  ]);

  useEffect(() => {
    const q = destinationQ.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      void triggerSuggest(q)
        .unwrap()
        .then((rows) => setSuggestions(rows))
        .catch(() => setSuggestions([]));
    }, 400);
    return () => clearTimeout(handle);
  }, [destinationQ, triggerSuggest]);

  const stationNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of stations) {
      m.set(s.id, s.name);
    }
    return m;
  }, [stations]);

  const buildParams = useCallback((): SearchVehiclesParams => {
    const params: SearchVehiclesParams = {
      page: 0,
      size: 50,
      activeOnly,
      sort,
    };
    if (stationId !== undefined) {
      params.stationId = stationId;
    }
    const dq = destinationQ.trim();
    if (dq.length > 0) {
      params.q = dq;
    }
    if (statusFilter !== undefined) {
      params.status = statusFilter;
    }
    const minN = parseInt(minFare.replace(/\s/g, ''), 10);
    if (!Number.isNaN(minN) && minFare.trim() !== '') {
      params.minFareXof = minN;
    }
    const maxN = parseInt(maxFare.replace(/\s/g, ''), 10);
    if (!Number.isNaN(maxN) && maxFare.trim() !== '') {
      params.maxFareXof = maxN;
    }
    const now = new Date();
    if (departurePreset === 'next2h') {
      params.departureAfter = now.toISOString();
      params.departureBefore = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();
    } else if (departurePreset === 'next6h') {
      params.departureAfter = now.toISOString();
      params.departureBefore = new Date(now.getTime() + 6 * 3600 * 1000).toISOString();
    } else if (departurePreset === 'today') {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      params.departureAfter = now.toISOString();
      params.departureBefore = end.toISOString();
    } else {
      const fromMin = parseInt(departureFromMinutes.replace(/\s/g, ''), 10);
      const toMin = parseInt(departureToMinutes.replace(/\s/g, ''), 10);
      if (!Number.isNaN(fromMin) && fromMin >= 0) {
        params.departureAfter = new Date(now.getTime() + fromMin * 60 * 1000).toISOString();
      }
      if (!Number.isNaN(toMin) && toMin >= 0) {
        params.departureBefore = new Date(now.getTime() + toMin * 60 * 1000).toISOString();
      }
    }
    return params;
  }, [
    activeOnly,
    departurePreset,
    departureFromMinutes,
    departureToMinutes,
    destinationQ,
    maxFare,
    minFare,
    sort,
    stationId,
    statusFilter,
  ]);

  const onSearch = useCallback(() => {
    Keyboard.dismiss();
    void triggerSearch(buildParams())
      .unwrap()
      .then(() => setHasSearched(true))
      .catch(() => {
        setHasSearched(true);
      });
  }, [buildParams, triggerSearch]);

  const list = searchState.data?.content ?? [];
  const loading = searchState.isLoading;
  const error = searchState.error;

  const header = (
    <View className="pb-md">
      <Text className="mb-xs text-xs font-medium text-textSecondary">Destination (ligne)</Text>
      <TextInput
        accessibilityLabel="Recherche destination"
        className="rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
        onChangeText={setDestinationQ}
        placeholder="Ex. Bissau, Gabú…"
        testID={`${testID}-input-destination`}
        value={destinationQ}
      />
      {suggestions.length > 0 && destinationQ.trim().length >= 2 ? (
        <View
          className="mt-xs max-h-40 rounded-default border border-border bg-surface"
          testID={`${testID}-suggestions`}
        >
          {suggestions.map((s) => (
            <Pressable
              key={s.label}
              accessibilityRole="button"
              className="border-b border-border px-md py-sm active:bg-background"
              onPress={() => {
                setDestinationQ(s.label);
                setSuggestions([]);
                Keyboard.dismiss();
              }}
            >
              <Text className="text-sm text-textPrimary">{s.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text className="mb-xs mt-md text-xs font-medium text-textSecondary">Gare</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-md">
        <Pressable
          accessibilityRole="button"
          className={`mr-xs rounded-full border px-md py-sm ${
            stationId === undefined ? 'border-primary bg-surface' : 'border-border bg-background'
          }`}
          onPress={() => setStationId(undefined)}
          testID={`${testID}-station-all`}
        >
          <Text className="text-xs text-textPrimary">Toutes</Text>
        </Pressable>
        {stations.map((s) => {
          const selected = stationId === s.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              className={`mr-xs rounded-full border px-md py-sm ${
                selected ? 'border-primary bg-surface' : 'border-border bg-background'
              }`}
              onPress={() => setStationId(s.id)}
              testID={`${testID}-station-${s.id}`}
            >
              <Text className="text-xs text-textPrimary" numberOfLines={1}>
                {s.city ?? s.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text className="mb-xs text-xs font-medium text-textSecondary">Statut véhicule</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-md">
        <Pressable
          className={`mr-xs rounded-full border px-md py-sm ${
            statusFilter === undefined ? 'border-primary bg-surface' : 'border-border bg-background'
          }`}
          onPress={() => setStatusFilter(undefined)}
        >
          <Text className="text-xs text-textPrimary">Tous</Text>
        </Pressable>
        {STATUS_OPTIONS.map((st) => (
          <Pressable
            key={st}
            className={`mr-xs rounded-full border px-md py-sm ${
              statusFilter === st ? 'border-primary bg-surface' : 'border-border bg-background'
            }`}
            onPress={() => setStatusFilter(st)}
          >
            <Text className="text-xs text-textPrimary">{STATUS_LABEL[st]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View className="mb-md flex-row gap-sm">
        <View className="flex-1">
          <Text className="mb-xs text-xs text-textSecondary">Tarif min (XOF)</Text>
          <TextInput
            className="rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
            keyboardType="number-pad"
            onChangeText={setMinFare}
            placeholder="Min"
            value={minFare}
          />
        </View>
        <View className="flex-1">
          <Text className="mb-xs text-xs text-textSecondary">Tarif max (XOF)</Text>
          <TextInput
            className="rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
            keyboardType="number-pad"
            onChangeText={setMaxFare}
            placeholder="Max"
            value={maxFare}
          />
        </View>
      </View>

      <View className="mb-md flex-row flex-wrap gap-sm">
        <Pressable
          className={`rounded-full border px-md py-sm ${
            departurePreset === 'next2h' ? 'border-primary bg-surface' : 'border-border bg-background'
          }`}
          onPress={() => setDeparturePreset((p) => (p === 'next2h' ? 'none' : 'next2h'))}
        >
          <Text className="text-xs text-textPrimary">Départ dans les 2 h</Text>
        </Pressable>
        <Pressable
          className={`rounded-full border px-md py-sm ${
            departurePreset === 'next6h' ? 'border-primary bg-surface' : 'border-border bg-background'
          }`}
          onPress={() => setDeparturePreset((p) => (p === 'next6h' ? 'none' : 'next6h'))}
        >
          <Text className="text-xs text-textPrimary">Départ dans les 6 h</Text>
        </Pressable>
        <Pressable
          className={`rounded-full border px-md py-sm ${
            departurePreset === 'today' ? 'border-primary bg-surface' : 'border-border bg-background'
          }`}
          onPress={() => setDeparturePreset((p) => (p === 'today' ? 'none' : 'today'))}
        >
          <Text className="text-xs text-textPrimary">Départ aujourd’hui</Text>
        </Pressable>
      </View>

      <View className="mb-md flex-row gap-sm">
        <View className="flex-1">
          <Text className="mb-xs text-xs text-textSecondary">Départ min (dans X min)</Text>
          <TextInput
            className="rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
            keyboardType="number-pad"
            onChangeText={setDepartureFromMinutes}
            placeholder="ex. 15"
            value={departureFromMinutes}
          />
        </View>
        <View className="flex-1">
          <Text className="mb-xs text-xs text-textSecondary">Départ max (dans X min)</Text>
          <TextInput
            className="rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
            keyboardType="number-pad"
            onChangeText={setDepartureToMinutes}
            placeholder="ex. 180"
            value={departureToMinutes}
          />
        </View>
      </View>

      <Text className="mb-xs text-xs font-medium text-textSecondary">Tri</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-md">
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            className={`mr-xs rounded-full border px-md py-sm ${
              sort === opt.id ? 'border-primary bg-surface' : 'border-border bg-background'
            }`}
            onPress={() => setSort(opt.id)}
          >
            <Text className="text-xs text-textPrimary">{opt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View className="mb-md flex-row items-center justify-between">
        <Text className="flex-1 text-sm text-textPrimary">Exclure les départs (Parti)</Text>
        <Switch value={activeOnly} onValueChange={setActiveOnly} />
      </View>

      <Pressable
        accessibilityRole="button"
        className="rounded-default bg-primary px-md py-md active:opacity-90"
        onPress={onSearch}
        testID={`${testID}-submit`}
      >
        <Text className="text-center text-sm font-semibold text-white">Rechercher</Text>
      </Pressable>

      {suggestState.isLoading ? (
        <Text className="mt-sm text-xs text-textSecondary">Suggestions…</Text>
      ) : null}
      {error ? (
        <Text className="mt-md text-sm text-error">{parseApiError(error)}</Text>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <FlatList
        className="flex-1 px-md"
        contentContainerStyle={{ paddingBottom: 24 }}
        data={list}
        keyExtractor={(item: Vehicle) => String(item.id)}
        ListEmptyComponent={
          hasSearched && !loading ? (
            <Text className="mt-lg text-center text-textSecondary" testID={`${testID}-empty`}>
              Aucun résultat. Ajustez les filtres ou lancez une recherche.
            </Text>
          ) : null
        }
        ListHeaderComponent={
          <>
            {header}
            {loading ? (
              <View className="flex-row items-center justify-center py-md">
                <ActivityIndicator />
                <Text className="ml-sm text-textSecondary">Recherche…</Text>
              </View>
            ) : null}
            {list.length > 0 ? (
              <Text className="mb-sm text-base font-semibold text-textPrimary">Résultats</Text>
            ) : null}
          </>
        }
        renderItem={({ item }) => {
          const canBook = item.availableSeats > 0 && item.status !== 'PARTI';
          const stationLabel = stationNameById.get(item.stationId) ?? `Gare #${item.stationId}`;
          return (
            <View
              className="mb-sm rounded-default border border-border bg-surface p-md"
              testID={`${testID}-result-${item.id}`}
            >
              <Text className="text-base font-semibold text-textPrimary">{item.registrationCode}</Text>
              <Text className="text-sm text-textSecondary">{item.routeLabel}</Text>
              <Text className="mt-xs text-sm text-textPrimary">{stationLabel}</Text>
              <Text className="mt-xs text-sm text-textSecondary">
                Places disponibles : {item.availableSeats} / {item.capacity} · {STATUS_LABEL[item.status]} · Départ :{' '}
                {formatDeparture(item.departureScheduledAt)}
              </Text>
              {item.estimatedWaitMinutes != null ? (
                <Text className="mt-xs text-sm text-textPrimary">
                  Attente estimée : ~{item.estimatedWaitMinutes} min
                </Text>
              ) : null}
              {item.fareAmountXof != null ? (
                <Text className="mt-xs text-sm text-textPrimary">
                  Tarif indicatif : {item.fareAmountXof.toLocaleString('fr-FR')} F CFA
                </Text>
              ) : null}
              {canReserve && canBook ? (
                <Pressable
                  accessibilityRole="button"
                  className="mt-md self-start rounded-default bg-primary px-md py-sm active:opacity-80"
                  onPress={() => {
                    navigation.navigate('SeatMap', {
                      vehicleId: item.id,
                      stationId: item.stationId,
                      stationName: stationLabel,
                      registrationCode: item.registrationCode,
                      routeLabel: item.routeLabel,
                      capacity: item.capacity,
                    });
                  }}
                  testID={`${testID}-reserve-${item.id}`}
                >
                  <Text className="text-sm font-semibold text-white">Choisir un siège</Text>
                </Pressable>
              ) : (
                <Text className="mt-md text-sm text-textSecondary">
                  {canReserve ? 'Aucune place disponible' : 'Connexion voyageur requise pour réserver'}
                </Text>
              )}
            </View>
          );
        }}
        testID={`${testID}-list`}
      />
    </View>
  );
}
