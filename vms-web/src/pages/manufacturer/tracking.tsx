import { useRef, useEffect, useState } from 'react';
import { useGetTracking, getGetTrackingQueryKey } from '@workspace/api-client-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Navigation } from 'lucide-react';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

const STATUS_COLORS: Record<string, string> = {
  'In Transit': '#f97316',
  'In Port': '#3b82f6',
  'Staging for Dispatch': '#a855f7',
  'QC Transfer': '#eab308',
  'At Facility': '#6b7280',
};

function createCarIcon(heading: number, status: string) {
  const color = STATUS_COLORS[status] ?? '#f97316';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <g transform="rotate(${heading}, 18, 18)">
        <circle cx="18" cy="18" r="14" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.5"/>
        <polygon points="18,7 24,26 18,22 12,26" fill="${color}" stroke="white" stroke-width="1.2"/>
      </g>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function createDotIcon(color: string, size = 8) {
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px ${color}80"></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createDestIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:transparent;border:2px solid ${color};box-shadow:0 0 6px ${color}60"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

type TrackingPoint = {
  vehicleId: number; lat: number; lng: number;
  originLat?: number | null; originLng?: number | null;
  destLat?: number | null; destLng?: number | null;
  heading?: number | null; speed?: number | null;
  progress?: number | null; status?: string | null;
  lastUpdated: string; vin?: string | null;
  make?: string | null; model?: string | null;
  distributorId?: number | null;
};

function RouteLayer({ points }: { points: TrackingPoint[] }) {
  const map = useMap();
  const layersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    points.forEach(p => {
      const status = p.status ?? 'In Transit';
      const color = STATUS_COLORS[status] ?? '#f97316';
      const icon = createCarIcon(p.heading ?? 0, status);
      const hasRoute = p.originLat != null && p.destLat != null;

      if (hasRoute) {
        const origin: [number, number] = [p.originLat!, p.originLng!];
        const current: [number, number] = [p.lat, p.lng];
        const dest: [number, number] = [p.destLat!, p.destLng!];

        const originDifferentFromCurrent = Math.abs(p.originLat! - p.lat) > 0.001 || Math.abs(p.originLng! - p.lng) > 0.001;
        const destDifferentFromCurrent = Math.abs(p.destLat! - p.lat) > 0.001 || Math.abs(p.destLng! - p.lng) > 0.001;

        if (originDifferentFromCurrent) {
          const completedLine = L.polyline([origin, current], {
            color, weight: 2, opacity: 0.35, dashArray: undefined,
          });
          map.addLayer(completedLine);
          layersRef.current.push(completedLine);

          const originDot = L.marker(origin, { icon: createDotIcon(color, 8) });
          map.addLayer(originDot);
          layersRef.current.push(originDot);
        }

        if (destDifferentFromCurrent) {
          const remainingLine = L.polyline([current, dest], {
            color, weight: 2.5, opacity: 0.9, dashArray: '8 6',
          });
          map.addLayer(remainingLine);
          layersRef.current.push(remainingLine);

          const destDot = L.marker(dest, { icon: createDestIcon(color) });
          map.addLayer(destDot);
          layersRef.current.push(destDot);
        }
      }

      const marker = L.marker([p.lat, p.lng], { icon });
      const popupContent = `
        <div style="font-family:monospace;min-width:180px;padding:4px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${p.make} ${p.model}</div>
          <div style="color:#888;font-size:10px;margin-bottom:8px">${p.vin}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px">
            <div><span style="color:#888">STATUS</span><br/><span style="color:${color};font-weight:600">${status}</span></div>
            <div><span style="color:#888">SPEED</span><br/><span>${(p.speed ?? 0)} km/h</span></div>
            <div><span style="color:#888">HEADING</span><br/><span>${(p.heading ?? 0)}°</span></div>
            <div><span style="color:#888">PROGRESS</span><br/><span>${Math.round((p.progress ?? 0) * 100)}%</span></div>
          </div>
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid #333;color:#888;font-size:9px">
            Last ping: ${new Date(p.lastUpdated).toLocaleTimeString()}
          </div>
        </div>`;
      marker.bindPopup(popupContent, { maxWidth: 220 });
      map.addLayer(marker);
      layersRef.current.push(marker);
    });

    return () => {
      layersRef.current.forEach(l => map.removeLayer(l));
    };
  }, [points, map]);

  return null;
}

export default function ManufacturerTracking() {
  const { data: trackingPoints, isLoading } = useGetTracking(
    {},
    { query: { queryKey: getGetTrackingQueryKey({}), refetchInterval: 30_000 } }
  );
  const [selected, setSelected] = useState<TrackingPoint | null>(null);

  const transitCount = trackingPoints?.filter(p => p.status === 'In Transit').length ?? 0;
  const inPortCount = trackingPoints?.filter(p => p.status === 'In Port').length ?? 0;

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Global Logistics Map</h1>
            <p className="text-muted-foreground font-mono mt-1">REALTIME_FLEET_TRACKING</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <Badge key={status} variant="outline" className="font-mono text-[10px] border-border gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                {status.toUpperCase().replace(/ /g, '_')}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Tracked', value: trackingPoints?.length ?? 0, color: 'text-foreground' },
            { label: 'In Transit', value: transitCount, color: 'text-orange-400' },
            { label: 'In Port', value: inPortCount, color: 'text-blue-400' },
            { label: 'At Facility', value: (trackingPoints?.length ?? 0) - transitCount - inPortCount, color: 'text-muted-foreground' },
          ].map(stat => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-mono text-muted-foreground">{stat.label.toUpperCase().replace(/ /g, '_')}</p>
                <p className={`text-2xl font-bold font-mono mt-1 ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border overflow-hidden bg-card">
          <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Live Fleet Positions
              <span className="ml-auto text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                LIVE
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-0">
            {isLoading ? (
              <div className="h-[580px] flex items-center justify-center text-muted-foreground font-mono text-sm bg-muted/10">
                LOADING_TELEMETRY...
              </div>
            ) : (
              <MapContainer
                center={[35, 20]}
                zoom={2}
                style={{ height: '580px', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {trackingPoints && <RouteLayer points={trackingPoints as TrackingPoint[]} />}
              </MapContainer>
            )}
          </CardContent>
        </Card>

        {trackingPoints && trackingPoints.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="py-3 border-b border-border/50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                Vehicle Status Board
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {trackingPoints.map(p => {
                  const status = p.status ?? 'Unknown';
                  const color = STATUS_COLORS[status] ?? '#6b7280';
                  return (
                    <div key={p.vehicleId} className="flex items-center gap-4 px-5 py-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{p.make} {p.model}</p>
                        <p className="text-xs font-mono text-muted-foreground">{p.vin}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="font-mono text-[9px] border-border" style={{ color, borderColor: `${color}50` }}>
                          {status.toUpperCase().replace(/ /g, '_')}
                        </Badge>
                      </div>
                      <div className="text-right text-xs font-mono w-20">
                        <span className="text-muted-foreground">{p.speed ?? 0} km/h</span>
                      </div>
                      <div className="text-right text-xs font-mono w-16">
                        <span className="text-muted-foreground">{Math.round((p.progress ?? 0) * 100)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
