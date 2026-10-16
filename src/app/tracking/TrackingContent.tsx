'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useState, useRef } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { MapPin, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { formatDateTime } from '@/lib/utils';

interface Shipment {
  id: string;
  referenceNumber: string;
  mode: string;
  status: string;
  origin: string;
  destination: string;
  originCountry: string | null;
  destinationCountry: string | null;
  customer: { legalName: string };
  trackingEvents: Array<{
    id: string;
    eventType: string;
    location: string | null;
    latitude: string | null;
    longitude: string | null;
    occurredAt: string;
    source: string;
    isVerified: boolean;
    description: string | null;
  }>;
}

export function TrackingContent() {
  const { t, lang } = useLanguage();
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/shipments?status=IN_TRANSIT&pageSize=30')
      .then(r => r.json())
      .then(async d => {
        const ships = d.data ?? [];
        // Load tracking events for each
        const withEvents = await Promise.all(ships.map(async (s: Shipment) => {
          const r = await fetch(`/api/shipments/${s.id}`);
          const d2 = await r.json();
          return { ...s, trackingEvents: d2.data?.trackingEvents ?? [] };
        }));
        setShipments(withEvents);
        if (withEvents.length > 0) setSelected(withEvents[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mapToken || mapToken.includes('your_') || !mapRef.current) return;

    const container = mapRef.current;
    let map: MapboxMap | null = null;
    let disposed = false;
    setMapReady(false);
    setMapError('');
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (disposed) return;
      mapboxgl.accessToken = mapToken;
      map = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [30.0444, 31.2357],
        zoom: 1.6,
      });
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.on('load', () => {
        if (!disposed) setMapReady(true);
      });
      map.on('error', () => {
        if (!disposed) setMapError('Map service could not load. Verify the public Mapbox token and network access.');
      });

      shipments.forEach((shipment) => {
        shipment.trackingEvents.forEach((event) => {
          const latitude = Number(event.latitude);
          const longitude = Number(event.longitude);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
          new mapboxgl.Marker()
            .setLngLat([longitude, latitude])
            .setPopup(new mapboxgl.Popup().setText(`${shipment.referenceNumber} · ${event.eventType}${event.location ? ` · ${event.location}` : ''}`))
            .addTo(map!);
        });
      });
    }).catch((error: unknown) => {
      if (!disposed) setMapError(error instanceof Error ? error.message : 'Map could not be initialized.');
    });

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [mapToken, shipments]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('tracking.title')}</h1>
        {!mapToken || mapToken.includes('your_') ? (
          <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-sm text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400">
            <AlertCircle className="h-4 w-4" />
            {t('tracking.noLiveTracking')} — Configure NEXT_PUBLIC_MAPBOX_TOKEN to enable map
          </div>
        ) : mapReady && !mapError ? (
          <Badge variant="success">Map Active</Badge>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-sm text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400">
            <AlertCircle className="h-4 w-4" />
            {mapError || (lang === 'ar' ? 'جارٍ تحميل الخريطة...' : 'Loading map...')}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Shipment list */}
        <div className="space-y-2 lg:col-span-1 overflow-y-auto max-h-[70vh]">
          <p className="text-sm font-medium text-muted-foreground mb-3">{shipments.length} Active Shipments</p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : shipments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No shipments currently in transit</p>
          ) : shipments.map(s => (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${selected?.id === s.id ? 'border-brand-navy bg-brand-navy/5 dark:border-brand-accent dark:bg-brand-accent/5' : 'hover:bg-muted/50'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-medium">{s.referenceNumber}</span>
                <Badge variant="outline" className="text-xs">{s.mode}</Badge>
              </div>
              <p className="text-sm font-medium truncate">{s.customer?.legalName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {s.origin} → {s.destination}
              </p>
              {s.trackingEvents?.[0] && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {s.trackingEvents[0].eventType} · {formatDateTime(s.trackingEvents[0].occurredAt)}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Map + detail */}
        <div className="lg:col-span-2 space-y-4">
          {/* Map placeholder */}
          <div
            ref={mapRef}
            className="h-[50vh] rounded-xl border overflow-hidden bg-slate-100 dark:bg-slate-800 relative"
          />
          {(!mapToken || mapToken.includes('your_') || mapError) && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-700 dark:text-blue-400">
              <strong>{lang === 'ar' ? 'الحالة:' : 'Status:'}</strong> {lang === 'ar'
                ? 'لا يوجد تتبع GPS مباشر مهيأ. مواقع الخريطة تعتمد على إحداثيات أحداث التتبع المسجلة.'
                : 'No live GPS feed is configured. Map markers use coordinates from recorded tracking events.'}
            </div>
          )}

          {/* Selected shipment timeline */}
          {selected && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{selected.referenceNumber} — {t('tracking.timeline')}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {selected.trackingEvents.length} events
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selected.trackingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No tracking events yet</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {selected.trackingEvents.map((ev, i) => (
                      <div key={ev.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`h-2 w-2 rounded-full mt-1.5 ${i === 0 ? 'bg-brand-accent' : 'bg-muted-foreground/30'}`} />
                          {i < selected.trackingEvents.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="pb-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{ev.eventType}</p>
                            {!ev.isVerified && <span className="text-xs text-muted-foreground">(unverified)</span>}
                            <Badge variant="outline" className="text-xs">{ev.source}</Badge>
                          </div>
                          {ev.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</p>}
                          {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5"><Clock className="inline h-3 w-3 me-1" />{formatDateTime(ev.occurredAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
