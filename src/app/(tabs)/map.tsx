import { useRouter } from 'expo-router';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DraggableCard } from '@/components/care/draggable-card';
import { locationChip, locationStatusText, readableTime } from '@/components/care/format';
import { SafePlaceForm } from '@/components/care/safe-place-form';
import { WardMarker } from '@/components/care/ward-marker';
import {
  AppText, Avatar, BottomSheet, Button, Chip, EmptyState, Glass, Icon, IconButton, IconCircle, ListItem, Skeleton,
  useTabBarSpace,
} from '@/components/ui';
import { DEFAULT_SAFE_RADIUS, MAP_FALLBACK } from '@/config/care';
import { usePrimaryCareData } from '@/hooks/use-care-data';
import { useLocalization } from '@/localization';
import { assessLocation } from '@/services/care-logic';
import { saveWard } from '@/services/care-repository';
import { makeStyles, useAppTheme, withAlpha } from '@/theme';
import type { Coordinates, SafePlace } from '@/types/care';

const presets = [20, 50, 100, 250];
const DELTA = 0.015;

/** Firestore data is untyped at runtime: coerce and reject NaN / out-of-range values so MapView never gets an invalid region. */
const toCoords = (c: unknown): Coordinates | undefined => {
  if (!c || typeof c !== 'object') return undefined;
  const lat = Number((c as { lat?: unknown }).lat);
  const lng = Number((c as { lng?: unknown }).lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : undefined;
};
const toLatLng = (c: Coordinates) => ({ latitude: c.lat, longitude: c.lng });
const newPlaceId = () => `${Date.now()}`;

export default function LocationScreen() {
  const router = useRouter();
  const { t } = useLocalization();
  const { colors, isDark } = useAppTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { height: windowHeight } = useWindowDimensions();
  const { ward, device, loading, error } = usePrimaryCareData();
  const [draft, setDraft] = useState<Partial<SafePlace> | null>(null);
  const [schedule, setSchedule] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [showPlaces, setShowPlaces] = useState(true);
  const mapRef = useRef<MapView>(null);

  const location = toCoords(device?.location);
  const places = (ward?.safePlaces ?? []).flatMap((p) => {
    const loc = toCoords(p.location);
    return loc ? [{ ...p, location: loc }] : [];
  });
  const center = location ?? places[0]?.location ?? MAP_FALLBACK;
  const { lat: centerLat, lng: centerLng } = center;

  useEffect(() => {
    mapRef.current?.animateToRegion({ latitude: centerLat, longitude: centerLng, latitudeDelta: DELTA, longitudeDelta: DELTA }, 400);
  }, [centerLat, centerLng]);

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/home'));

  if (loading) {
    return (
      <View style={[s.page, s.center]} accessible accessibilityLabel={t('loadingLocation')} accessibilityState={{ busy: true }}>
        <Skeleton height={220} radius={28} style={s.skeleton} />
        <AppText variant="caption" tone="muted">{t('loadingLocation')}</AppText>
      </View>
    );
  }
  if (!ward) {
    return (
      <View style={[s.page, s.center, { paddingBottom: tabSpace }]}>
        <EmptyState icon="map" title={t('tabMap')} description={t('addPersonPrompt')} actionTitle={t('addPerson')} onAction={() => router.push('/ward')} />
      </View>
    );
  }

  const assessment = assessLocation(location, places, ward.safeRoutes);
  const chip = locationChip(assessment, t);
  const accuracy = Number(device?.location?.accuracyM ?? device?.location?.accuracy);
  const source = device?.location?.source;
  const placeColors = [colors.primary, colors.success, colors.lavender, colors.cyan];

  const addAt = ({ nativeEvent }: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) =>
    draft && setDraft({ ...draft, location: { lat: nativeEvent.coordinate.latitude, lng: nativeEvent.coordinate.longitude } });

  const save = async () => {
    if (!draft?.name || !draft.location) return Alert.alert(t('safePlace'), t('selectMapLocation'));
    const [start, end] = schedule.split('-').map((x) => x.trim());
    const place: SafePlace = {
      id: draft.id ?? newPlaceId(), name: draft.name, address: draft.address ?? '', location: draft.location,
      radius: Number(draft.radius) || DEFAULT_SAFE_RADIUS, schedule: start && end ? [{ start, end }] : undefined,
    };
    const next = places.some((p) => p.id === place.id) ? places.map((p) => (p.id === place.id ? place : p)) : [...places, place];
    try {
      await saveWard(ward.id, { safePlaces: next });
      setDraft(null);
      setSchedule('');
    } catch {
      Alert.alert(t('safePlacesError'), t('safePlacesError'));
    }
  };

  const remove = (id: string, name: string) => Alert.alert(t('deletePlace'), name, [
    { text: t('cancel'), style: 'cancel' },
    {
      text: t('delete'), style: 'destructive',
      onPress: () => saveWard(ward.id, { safePlaces: places.filter((p) => p.id !== id) }).catch(() => Alert.alert(t('safePlacesError'), t('safePlacesError'))),
    },
  ]);

  const startDraft = (place?: SafePlace) => {
    setPlacesOpen(false);
    setDraft(place ?? { radius: DEFAULT_SAFE_RADIUS });
    setSchedule(place?.schedule?.[0] ? `${place.schedule[0].start}-${place.schedule[0].end}` : '');
  };
  const cancelDraft = () => { setDraft(null); setSchedule(''); };

  const openRoute = () => {
    if (!location) return;
    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`);
  };
  const call = () => { if (ward.braceletPhone) void Linking.openURL(`tel:${ward.braceletPhone}`); };
  const recenter = () => mapRef.current?.animateToRegion({ ...toLatLng(center), latitudeDelta: DELTA, longitudeDelta: DELTA }, 400);

  const address = device?.location?.address ?? (location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : t('waitingLocation'));

  return (
    <View style={s.page}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...toLatLng(center), latitudeDelta: DELTA, longitudeDelta: DELTA }}
        onPress={addAt}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        showsCompass={false}
        toolbarEnabled={false}
        mapPadding={{ top: insets.top + 64, right: 0, bottom: tabSpace + 140, left: 0 }}
      >
        {location && Number.isFinite(accuracy) && accuracy > 0 ? (
          <Circle center={toLatLng(location)} radius={accuracy} strokeColor={withAlpha(colors.primary, 0.35)} fillColor={withAlpha(colors.primary, 0.12)} strokeWidth={1} />
        ) : null}
        {showPlaces ? places.map((p, i) => {
          const color = placeColors[i % placeColors.length];
          return (
            <Fragment key={p.id}>
              <Circle
                center={toLatLng(p.location)}
                radius={Number(p.radius) > 0 ? Number(p.radius) : DEFAULT_SAFE_RADIUS}
                strokeColor={color}
                strokeWidth={2}
                fillColor={withAlpha(color, 0.14)}
              />
              <Marker coordinate={toLatLng(p.location)} title={p.name} description={p.address} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={[s.placeDot, { borderColor: color }]}><View style={[s.placeDotInner, { backgroundColor: color }]} /></View>
              </Marker>
            </Fragment>
          );
        }) : null}
        {showPlaces ? (ward.safeRoutes ?? []).map((r) => {
          const pts = (r.points ?? []).map(toCoords).filter((p): p is Coordinates => !!p);
          return pts.length > 1 ? <Polyline key={r.id} coordinates={pts.map(toLatLng)} strokeColor={colors.onLavenderSoft} strokeWidth={5} lineCap="round" /> : null;
        }) : null}
        {location ? <WardMarker coordinate={toLatLng(location)} title={ward.name} alert={!assessment.safe} /> : null}
        {draft?.location ? <Marker coordinate={toLatLng(draft.location)} pinColor={colors.warning} title={t('safePlace')} /> : null}
      </MapView>

      <View style={[s.topBar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <IconButton icon="arrow-back" variant="glass" onPress={goBack} accessibilityLabel={t('back')} />
        <Glass style={s.titlePill}>
          <AppText variant="title" numberOfLines={1}>{t('location')}</AppText>
        </Glass>
        <IconButton icon="options-outline" variant="glass" onPress={() => setPlacesOpen(true)} accessibilityLabel={t('filter')} />
      </View>
      <View style={[s.sideButtons, { top: insets.top + 64 }]} pointerEvents="box-none">
        <IconButton icon="locate" variant="glass" onPress={recenter} accessibilityLabel={t('centerOnWard')} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.sheetHost, { bottom: tabSpace - 8 }]} pointerEvents="box-none">
        {draft ? (
          <View style={[s.draftCard, { maxHeight: windowHeight * 0.55 }]}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <SafePlaceForm
                draft={draft}
                onChange={setDraft}
                schedule={schedule}
                onScheduleChange={setSchedule}
                presets={presets}
                onCancel={cancelDraft}
                onSave={() => void save()}
              />
            </ScrollView>
          </View>
        ) : (
          <DraggableCard
            expanded={expanded}
            onExpandedChange={setExpanded}
            toggleLabel={t('location')}
            peek={
              <View style={s.peek}>
                <View style={s.wardRow}>
                  <Avatar name={ward.name} size={44} />
                  <View style={s.flex}>
                    <AppText variant="title" numberOfLines={1}>{ward.name}</AppText>
                    <AppText variant="caption" tone="muted" numberOfLines={2}>{address}</AppText>
                  </View>
                  <Chip label={chip.label} tone={chip.tone} icon={chip.icon} />
                </View>
                {error ? <AppText variant="caption" tone="danger">{t('deviceError')}</AppText> : null}
                <View style={s.actions}>
                  <Button title={t('route')} icon="navigate" onPress={openRoute} disabled={!location} style={s.flex} />
                  <IconButton icon="call" variant="soft" size={52} onPress={call} disabled={!ward.braceletPhone} accessibilityLabel={t('call')} />
                </View>
              </View>
            }
          >
            <View style={s.details}>
              <DetailRow icon="navigate-circle" label={locationStatusText(assessment, t)} />
              <DetailRow icon="time-outline" label={`${t('lastUpdated')}: ${readableTime(device?.location?.updatedAt, t('unavailable'))}`} />
              {source ? (
                <DetailRow
                  icon={source === 'cell' ? 'cellular' : 'locate'}
                  label={`${t('locationSource')}: ${source === 'cell' ? t('sourceCell') : source === 'gps' ? t('sourceGps') : source}${Number.isFinite(accuracy) && accuracy > 0 ? ` · ${t('accuracyMeters', { m: Math.round(accuracy) })}` : ''}`}
                />
              ) : null}
              <Button variant="secondary" icon="add" title={t('addSafePlace')} onPress={() => startDraft()} />
            </View>
          </DraggableCard>
        )}
      </KeyboardAvoidingView>

      <BottomSheet visible={placesOpen} onClose={() => setPlacesOpen(false)} title={t('showSafePlaces')}>
        <ScrollView contentContainerStyle={s.sheetContent}>
          <ListItem
            icon={showPlaces ? 'eye' : 'eye-off'}
            iconTone={showPlaces ? 'primary' : 'neutral'}
            title={t('showSafePlaces')}
            onPress={() => setShowPlaces((v) => !v)}
            metaAccent={<Icon name={showPlaces ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={showPlaces ? colors.primary : colors.textMuted} />}
            accessibilityLabel={`${t('showSafePlaces')}: ${showPlaces ? '✓' : '—'}`}
          />
          {places.length === 0 ? (
            <AppText variant="body" tone="muted" center>{t('noSafePlaces')}</AppText>
          ) : places.map((p, i) => (
            <View key={p.id} style={s.placeRow}>
              <IconCircle name="shield-checkmark" tone={(['primary', 'success', 'lavender', 'cyan'] as const)[i % 4]} />
              <View style={s.flex}>
                <AppText variant="bodyStrong">{p.name}</AppText>
                <AppText variant="caption" tone="muted">{p.radius} m · {p.address || t('noAddress')}</AppText>
              </View>
              <IconButton icon="create-outline" variant="soft" onPress={() => startDraft(p)} accessibilityLabel={`${t('edit')}: ${p.name}`} />
              <IconButton icon="trash-outline" variant="surface" onPress={() => remove(p.id, p.name)} accessibilityLabel={`${t('delete')}: ${p.name}`} />
            </View>
          ))}
          <Button icon="add" title={t('addSafePlace')} onPress={() => startDraft()} />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

function DetailRow({ icon, label }: { icon: 'navigate-circle' | 'time-outline' | 'cellular' | 'locate'; label: string }) {
  const { colors } = useAppTheme();
  const s = useStyles();
  return (
    <View style={s.detailRow}>
      <Icon name={icon} size={18} color={colors.textMuted} />
      <AppText variant="caption" tone="secondary" style={s.flex}>{label}</AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  page: { flex: 1, backgroundColor: t.colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: t.spacing.screen, gap: t.spacing.sm },
  skeleton: { alignSelf: 'stretch' },
  flex: { flex: 1 },
  topBar: { position: 'absolute', left: t.spacing.screen, right: t.spacing.screen, flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  titlePill: { flex: 1, minHeight: t.touchTarget, borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.spacing.md },
  sideButtons: { position: 'absolute', right: t.spacing.screen, gap: t.spacing.xs },
  sheetHost: { position: 'absolute', left: t.spacing.sm, right: t.spacing.sm },
  draftCard: {
    backgroundColor: t.colors.card, borderRadius: t.radius.xl, padding: t.spacing.lg, ...t.shadows.lg,
  },
  peek: { gap: t.spacing.md },
  wardRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  details: { gap: t.spacing.sm, paddingTop: t.spacing.md, marginTop: t.spacing.md, borderTopWidth: 1, borderTopColor: t.colors.border },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  placeDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 3, backgroundColor: t.colors.card, alignItems: 'center', justifyContent: 'center' },
  placeDotInner: { width: 6, height: 6, borderRadius: 3 },
  sheetContent: { paddingHorizontal: t.spacing.screen, paddingBottom: t.spacing.md, gap: t.spacing.sm },
  placeRow: {
    flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, padding: t.spacing.sm,
    backgroundColor: t.colors.card, borderRadius: t.radius.lg,
  },
}));
