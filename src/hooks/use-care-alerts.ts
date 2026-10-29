import { useEffect, useRef } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_HEALTH_THRESHOLDS } from '@/config/care';
import { assessLocation, healthStatus } from '@/services/care-logic';
import { createEvent } from '@/services/care-repository';
import { db } from '@/services/firebase';
import type { DeviceData, Ward } from '@/types/care';

// Client-side prototype automation. For production, mirror this transition logic in Cloud Functions.
export function useCareAlerts(ward: Ward | null, device: DeviceData | null) {
  const previous = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (!ward || !device || !ward.braceletId) return;
    const health = healthStatus(device, ward.healthThresholds ?? DEFAULT_HEALTH_THRESHOLDS);
    const location = assessLocation(device.location, ward.safePlaces, ward.safeRoutes);
    const checks = [
      { key: 'health', active: health.severity === 'critical', category: 'health' as const, type: 'health_out_of_range', description: 'Heart rate or blood oxygen is outside the configured range.', severity: 'critical' as const },
      { key: 'location', active: !location.safe && location.status !== 'Location unavailable', category: 'location' as const, type: 'location_violation', description: `Location warning: ${location.status}.`, severity: 'warning' as const },
      { key: 'removed', active: device.worn === false, category: 'bracelet' as const, type: 'bracelet_removed', description: 'Bracelet was removed.', severity: 'critical' as const },
      { key: 'disconnected', active: device.connected === false, category: 'bracelet' as const, type: 'bracelet_disconnected', description: 'Bracelet disconnected.', severity: 'warning' as const },
      { key: 'fall', active: device.fall_detected === true, category: 'alert' as const, type: 'fall_detected', description: 'Fall detected by bracelet.', severity: 'critical' as const },
    ];
    for (const item of checks) {
      const firstObservation = previous.current[item.key] === undefined;
      if (previous.current[item.key] === item.active) continue;
      previous.current[item.key] = item.active;
      if (firstObservation && !item.active) continue;
      const alertRef = doc(db, 'activeAlerts', `${ward.id}_${item.key}`);
      if (item.active) {
        void Promise.all([
          setDoc(alertRef, { wardId: ward.id, ...item, active: true, updatedAt: serverTimestamp() }),
          createEvent({ wardId: ward.id, category: item.category, type: item.type, description: item.description, severity: item.severity, requiresAttention: true }),
          setDoc(doc(db, 'devices', ward.braceletId), { commands: { alarm: 'alert_on', reason: item.type, updatedAt: serverTimestamp() } }, { merge: true }),
        ]);
      } else {
        void Promise.all([
          setDoc(alertRef, { wardId: ward.id, active: false, updatedAt: serverTimestamp() }, { merge: true }),
          createEvent({ wardId: ward.id, category: item.category, type: `${item.type}_resolved`, description: `${item.description} Resolved.`, severity: 'info', requiresAttention: item.key === 'health' || item.key === 'location' }),
        ]);
      }
    }
  }, [ward, device]);
}
