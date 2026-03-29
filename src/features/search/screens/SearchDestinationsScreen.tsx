import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PassengerStackParamList } from '@/app/navigation/navigationTypes';
import { useLazyGetDestinationSuggestionsQuery, useLazySearchVehiclesQuery } from '@/features/search/api/searchApi';
import { searchFiltersStorage } from '@/features/search/lib/searchFiltersStorage';
import type { SearchVehiclesParams } from '@/features/search/types';
import { useGetStationsQuery } from '@/features/station/api/stationApi';
import type { Station } from '@/features/station/types';
import type { Vehicle, VehicleStatus } from '@/features/vehicle/types';
import { intlLocaleFromLanguage } from '@/shared/lib/intlLocale';
import { getAppRoleFromToken } from '@/shared/lib/jwtRole';
import { parseApiError } from '@/shared/utils/apiError';

const STATUS_OPTIONS: VehicleStatus[] = ['EN_FILE', 'REMPLISSAGE', 'COMPLET', 'PARTI'];

export type SearchSortId =
  | 'departureScheduledAt,asc'
  | 'departureScheduledAt,desc'
  | 'fareAmountXof,asc'
  | 'fareAmountXof,desc';

const DEFAULT_SORT: SearchSortId = 'departureScheduledAt,asc';

function formatDeparture(iso: string | null, locale: string): string {
  if (!iso) {
    return '—';
  }
  try {
    return new Date(iso).toLocaleString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '—';
  }
}

function countActiveFilters(p: {
  stationId: number | undefined;
  statusFilter: VehicleStatus | undefined;
  minFare: string;
  maxFare: string;
  departurePreset: 'none' | 'next2h' | 'next6h' | 'today';
  departureFromMinutes: string;
  departureToMinutes: string;
  sort: SearchSortId;
  activeOnly: boolean;
}): number {
  let n = 0;
  if (p.stationId !== undefined) {
    n++;
  }
  if (p.statusFilter !== undefined) {
    n++;
  }
  if (p.minFare.trim() !== '') {
    n++;
  }
  if (p.maxFare.trim() !== '') {
    n++;
  }
  if (p.departurePreset !== 'none') {
    n++;
  }
  if (p.departureFromMinutes.trim() !== '') {
    n++;
  }
  if (p.departureToMinutes.trim() !== '') {
    n++;
  }
  if (p.sort !== DEFAULT_SORT) {
    n++;
  }
  if (!p.activeOnly) {
    n++;
  }
  return n;
}

type FiltersSheetProps = {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  testID: string;
  stations: Station[];
  stationId: number | undefined;
  setStationId: (v: number | undefined) => void;
  statusFilter: VehicleStatus | undefined;
  setStatusFilter: (v: VehicleStatus | undefined) => void;
  minFare: string;
  setMinFare: (v: string) => void;
  maxFare: string;
  setMaxFare: (v: string) => void;
  activeOnly: boolean;
  setActiveOnly: (v: boolean) => void;
  departurePreset: 'none' | 'next2h' | 'next6h' | 'today';
  setDeparturePreset: (v: 'none' | 'next2h' | 'next6h' | 'today') => void;
  departureFromMinutes: string;
  setDepartureFromMinutes: (v: string) => void;
  departureToMinutes: string;
  setDepartureToMinutes: (v: string) => void;
  sort: SearchSortId;
  setSort: (v: SearchSortId) => void;
};

const SORT_ROWS: [
  SearchSortId,
  'search.sortDepartureAsc' | 'search.sortDepartureDesc' | 'search.sortFareAsc' | 'search.sortFareDesc',
][] = [
  ['departureScheduledAt,asc', 'search.sortDepartureAsc'],
  ['departureScheduledAt,desc', 'search.sortDepartureDesc'],
  ['fareAmountXof,asc', 'search.sortFareAsc'],
  ['fareAmountXof,desc', 'search.sortFareDesc'],
];

function SearchFiltersSheet({
  visible,
  onClose,
  onApply,
  onReset,
  testID,
  stations,
  stationId,
  setStationId,
  statusFilter,
  setStatusFilter,
  minFare,
  setMinFare,
  maxFare,
  setMaxFare,
  activeOnly,
  setActiveOnly,
  departurePreset,
  setDeparturePreset,
  departureFromMinutes,
  setDepartureFromMinutes,
  departureToMinutes,
  setDepartureToMinutes,
  sort,
  setSort,
}: FiltersSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const sortOptions = useMemo(
    () => SORT_ROWS.map(([id, key]) => ({ id, label: t(key) })),
    [t],
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
      testID={`${testID}-filters-modal`}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <View className="flex-1 justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('search.closeFiltersA11y')}
            className="absolute bottom-0 left-0 right-0 top-0 bg-black/50"
            onPress={onClose}
            testID={`${testID}-filters-backdrop`}
          />
          <View className="max-h-[88%] w-full rounded-t-2xl border-t border-border bg-background">
            <View className="flex-row items-center justify-between border-b border-border px-md py-sm">
              <Text className="text-lg font-semibold text-textPrimary">{t('search.filtersTitle')}</Text>
              <Pressable
                accessibilityRole="button"
                className="px-sm py-xs active:opacity-70"
                hitSlop={12}
                onPress={onClose}
                testID={`${testID}-filters-close`}
              >
                <Text className="text-base font-medium text-primary">{t('search.close')}</Text>
              </Pressable>
            </View>
            <ScrollView
              className="px-md pt-md"
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <Text className="mb-xs text-xs font-medium text-textSecondary">Gare</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-md">
                <Pressable
                  accessibilityRole="button"
                  className={`mr-xs rounded-full border px-md py-sm ${
                    stationId === undefined ? 'border-primary bg-surface' : 'border-border bg-background'
                  }`}
                  onPress={() => setStationId(undefined)}
                  testID={`${testID}-station-all`}
                >
                  <Text className="text-xs text-textPrimary">{t('common.all')}</Text>
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

              <Text className="mb-xs text-xs font-medium text-textSecondary">{t('search.vehicleStatus')}</Text>
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
                    <Text className="text-xs text-textPrimary">{t(`vehicleStatus.${st}`)}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View className="mb-md flex-row gap-sm">
                <View className="flex-1">
                  <Text className="mb-xs text-xs text-textSecondary">{t('search.fareMin')}</Text>
                  <TextInput
                    className="rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
                    keyboardType="number-pad"
                    onChangeText={setMinFare}
                    placeholder={t('search.min')}
                    value={minFare}
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-xs text-xs text-textSecondary">{t('search.fareMax')}</Text>
                  <TextInput
                    className="rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
                    keyboardType="number-pad"
                    onChangeText={setMaxFare}
                    placeholder={t('search.max')}
                    value={maxFare}
                  />
                </View>
              </View>

              <View className="mb-md flex-row flex-wrap gap-sm">
                <Pressable
                  className={`rounded-full border px-md py-sm ${
                    departurePreset === 'next2h' ? 'border-primary bg-surface' : 'border-border bg-background'
                  }`}
                  onPress={() => setDeparturePreset(departurePreset === 'next2h' ? 'none' : 'next2h')}
                >
                  <Text className="text-xs text-textPrimary">{t('search.depNext2h')}</Text>
                </Pressable>
                <Pressable
                  className={`rounded-full border px-md py-sm ${
                    departurePreset === 'next6h' ? 'border-primary bg-surface' : 'border-border bg-background'
                  }`}
                  onPress={() => setDeparturePreset(departurePreset === 'next6h' ? 'none' : 'next6h')}
                >
                  <Text className="text-xs text-textPrimary">{t('search.depNext6h')}</Text>
                </Pressable>
                <Pressable
                  className={`rounded-full border px-md py-sm ${
                    departurePreset === 'today' ? 'border-primary bg-surface' : 'border-border bg-background'
                  }`}
                  onPress={() => setDeparturePreset(departurePreset === 'today' ? 'none' : 'today')}
                >
                  <Text className="text-xs text-textPrimary">Départ aujourd’hui</Text>
                </Pressable>
              </View>

              <View className="mb-md flex-row gap-sm">
                <View className="flex-1">
                  <Text className="mb-xs text-xs text-textSecondary">{t('search.depMinMinutes')}</Text>
                  <TextInput
                    className="rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
                    keyboardType="number-pad"
                    onChangeText={setDepartureFromMinutes}
                    placeholder={t('search.placeholderMinutes')}
                    value={departureFromMinutes}
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-xs text-xs text-textSecondary">Départ max (dans X min)</Text>
                  <TextInput
                    className="rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
                    keyboardType="number-pad"
                    onChangeText={setDepartureToMinutes}
                    placeholder={t('search.placeholderMinutesTo')}
                    value={departureToMinutes}
                  />
                </View>
              </View>

              <Text className="mb-xs text-xs font-medium text-textSecondary">{t('search.sort')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-md">
                {sortOptions.map((opt) => (
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
                <Text className="flex-1 text-sm text-textPrimary">{t('search.excludeDeparted')}</Text>
                <Switch value={activeOnly} onValueChange={setActiveOnly} />
              </View>

              <Pressable
                accessibilityRole="button"
                className="mb-sm self-start active:opacity-70"
                onPress={onReset}
                testID={`${testID}-filters-reset`}
              >
                <Text className="text-sm text-primary underline">Réinitialiser les filtres</Text>
              </Pressable>
            </ScrollView>

            <View
              className="border-t border-border bg-background px-md pt-md"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <Pressable
                accessibilityRole="button"
                className="rounded-default bg-primary px-md py-md active:opacity-90"
                onPress={onApply}
                testID={`${testID}-filters-apply`}
              >
                <Text className="text-center text-sm font-semibold text-white">{t('search.applySearch')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type SearchDestinationsScreenProps = NativeStackScreenProps<
  PassengerStackParamList,
  'SearchDestination'
>;

export default function SearchDestinationsScreen({
  navigation,
  testID = 'screen-search-destination',
}: SearchDestinationsScreenProps & { testID?: string }) {
  const { t, i18n } = useTranslation();
  const dateLocale = intlLocaleFromLanguage(i18n.language);

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
  const [sort, setSort] = useState<SearchSortId>(DEFAULT_SORT);
  const [hasSearched, setHasSearched] = useState(false);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  /** Résultats affichés : source de vérité = promesse unwrap (évite searchState.data désynchronisé avec le lazy query). */
  const [searchList, setSearchList] = useState<Vehicle[] | null>(null);
  const searchRequestIdRef = useRef(0);

  const { data: stationsPage } = useGetStationsQuery({ page: 0, size: 100 });
  const stations = stationsPage?.page.content ?? [];

  const [triggerSuggest, suggestState] = useLazyGetDestinationSuggestionsQuery();
  const [triggerSearch, searchState] = useLazySearchVehiclesQuery();

  const canReserve = getAppRoleFromToken() === 'USER';

  const filterBadgeCount = useMemo(
    () =>
      countActiveFilters({
        stationId,
        statusFilter,
        minFare,
        maxFare,
        departurePreset,
        departureFromMinutes,
        departureToMinutes,
        sort,
        activeOnly,
      }),
    [
      stationId,
      statusFilter,
      minFare,
      maxFare,
      departurePreset,
      departureFromMinutes,
      departureToMinutes,
      sort,
      activeOnly,
    ],
  );

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
      // toMin === 0 ⇒ « avant maintenant » : exclut les départs futurs (seed / démo).
      if (!Number.isNaN(toMin) && toMin > 0) {
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

  const runSearch = useCallback(() => {
    Keyboard.dismiss();
    const id = ++searchRequestIdRef.current;
    const params = buildParams();
    void triggerSearch(params)
      .unwrap()
      .then((page) => {
        if (searchRequestIdRef.current !== id) {
          return;
        }
        setSearchList(page.content ?? []);
        setHasSearched(true);
      })
      .catch(() => {
        if (searchRequestIdRef.current !== id) {
          return;
        }
        setSearchList([]);
        setHasSearched(true);
      });
  }, [buildParams, triggerSearch]);

  const resetFilters = useCallback(() => {
    setStationId(undefined);
    setStatusFilter(undefined);
    setMinFare('');
    setMaxFare('');
    setActiveOnly(true);
    setDeparturePreset('none');
    setDepartureFromMinutes('');
    setDepartureToMinutes('');
    setSort(DEFAULT_SORT);
  }, []);

  const applyFiltersAndSearch = useCallback(() => {
    setFiltersSheetOpen(false);
    runSearch();
  }, [runSearch]);

  const list = searchList ?? [];
  /** isFetching couvre aussi les relances lazy ; isLoading seul peut rester false alors que la requête court. */
  const loading = searchState.isFetching;
  const error = searchState.error;

  const listHeader = useMemo(() => {
    if (loading) {
      return (
        <View className="flex-row items-center justify-center py-sm">
          <ActivityIndicator />
          <Text className="ml-sm text-textSecondary">{t('search.searching')}</Text>
        </View>
      );
    }
    if (list.length > 0) {
      return (
        <Text className="mb-sm mt-xs text-base font-semibold text-textPrimary" testID={`${testID}-results-title`}>
          {t('search.results', { count: list.length })}
        </Text>
      );
    }
    return null;
  }, [loading, list.length, testID, t, i18n.language]);

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <View className="border-b border-border px-md pb-sm pt-sm">
        <Text className="mb-xs text-xs font-medium text-textSecondary">{t('search.destinationLine')}</Text>
        <TextInput
          accessibilityLabel={t('search.destinationA11y')}
          className="rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
          onChangeText={setDestinationQ}
          placeholder={t('search.destinationPlaceholder')}
          testID={`${testID}-input-destination`}
          value={destinationQ}
        />
        {suggestions.length > 0 && destinationQ.trim().length >= 2 ? (
          <View
            className="mt-xs max-h-36 rounded-default border border-border bg-surface"
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

        <Pressable
          accessibilityRole="button"
          className="mt-md flex-row items-center justify-center rounded-default border border-border bg-surface px-md py-md active:opacity-90"
          onPress={() => {
            Keyboard.dismiss();
            setFiltersSheetOpen(true);
          }}
          testID={`${testID}-open-filters`}
        >
          <Text className="text-center text-sm font-semibold text-textPrimary">{t('search.filters')}</Text>
          {filterBadgeCount > 0 ? (
            <View className="ml-sm min-w-[22px] rounded-full bg-primary px-xs py-px">
              <Text className="text-center text-xs font-bold text-white">{filterBadgeCount}</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          className="mt-sm rounded-default bg-primary px-md py-md active:opacity-90"
          onPress={runSearch}
          testID={`${testID}-submit`}
        >
          <Text className="text-center text-sm font-semibold text-white">Rechercher</Text>
        </Pressable>

        {suggestState.isLoading ? (
          <Text className="mt-xs text-xs text-textSecondary">{t('search.suggestionsLoading')}</Text>
        ) : null}
        {error ? (
          <Text className="mt-sm text-sm text-error" testID={`${testID}-error`}>
            {parseApiError(error)}
          </Text>
        ) : null}
      </View>

      {/*
        flexGrow sur contentContainerStyle casse souvent la virtualisation FlatList (cellules invisibles).
        minHeight: 0 + flex: 1 sur le conteneur évite que la liste prenne 0 px de hauteur avec flex parents.
      */}
      <View className="flex-1 px-md" style={{ flex: 1, minHeight: 0 }}>
        <FlatList
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
          data={list}
          extraData={list.length}
          keyExtractor={(item: Vehicle) => String(item.id)}
          ListEmptyComponent={
            hasSearched && !loading ? (
              <Text className="mt-lg text-center text-textSecondary" testID={`${testID}-empty`}>
                {t('search.empty')}
              </Text>
            ) : !hasSearched && !loading ? (
              <Text className="mt-lg text-center text-sm text-textSecondary" testID={`${testID}-hint`}>
                {t('search.hint')}
              </Text>
            ) : null
          }
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => {
            const canBook = item.availableSeats > 0 && item.status !== 'PARTI';
            const stationLabel =
              stationNameById.get(item.stationId) ?? t('search.stationHash', { id: item.stationId });
            const fareStr =
              item.fareAmountXof != null ? item.fareAmountXof.toLocaleString(dateLocale) : '';
            return (
              <View
                className="mb-sm rounded-default border border-border bg-surface p-md"
                testID={`${testID}-result-${item.id}`}
              >
                <Text className="text-base font-semibold text-textPrimary">{item.registrationCode}</Text>
                <Text className="text-sm text-textSecondary">{item.routeLabel}</Text>
                <Text className="mt-xs text-sm text-textPrimary">{stationLabel}</Text>
                <Text className="mt-xs text-sm text-textSecondary">
                  {t('search.availableSeats')} : {item.availableSeats} / {item.capacity} · {t(`vehicleStatus.${item.status}`)} ·{' '}
                  {t('search.departure')}: {formatDeparture(item.departureScheduledAt, dateLocale)}
                </Text>
                {item.estimatedWaitMinutes != null ? (
                  <Text className="mt-xs text-sm text-textPrimary">
                    {t('search.waitEstimate')} : {t('search.waitMinutes', { count: item.estimatedWaitMinutes })}
                  </Text>
                ) : null}
                {item.fareAmountXof != null ? (
                  <Text className="mt-xs text-sm text-textPrimary">
                    {t('search.fareIndicative')} : {t('search.currencyFcfa', { amount: fareStr })}
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
                    <Text className="text-sm font-semibold text-white">{t('search.chooseSeat')}</Text>
                  </Pressable>
                ) : (
                  <Text className="mt-md text-sm text-textSecondary">
                    {canReserve ? t('search.noSeats') : t('search.loginToBook')}
                  </Text>
                )}
              </View>
            );
          }}
          style={{ flex: 1 }}
          testID={`${testID}-list`}
        />
      </View>

      <SearchFiltersSheet
        activeOnly={activeOnly}
        departureFromMinutes={departureFromMinutes}
        departurePreset={departurePreset}
        departureToMinutes={departureToMinutes}
        maxFare={maxFare}
        minFare={minFare}
        onApply={applyFiltersAndSearch}
        onClose={() => {
          Keyboard.dismiss();
          setFiltersSheetOpen(false);
        }}
        onReset={resetFilters}
        setActiveOnly={setActiveOnly}
        setDepartureFromMinutes={setDepartureFromMinutes}
        setDeparturePreset={setDeparturePreset}
        setDepartureToMinutes={setDepartureToMinutes}
        setMaxFare={setMaxFare}
        setMinFare={setMinFare}
        setSort={setSort}
        setStationId={setStationId}
        setStatusFilter={setStatusFilter}
        sort={sort}
        stationId={stationId}
        stations={stations}
        statusFilter={statusFilter}
        testID={testID}
        visible={filtersSheetOpen}
      />
    </View>
  );
}
