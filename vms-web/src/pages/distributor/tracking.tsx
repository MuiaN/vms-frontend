import { useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useGetTracking, getGetTrackingQueryKey } from '@workspace/api-client-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Navigation, Package } from 'lucide-react';

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
        <circle cx="18" cy="18" r="14" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="1.5"/>
        <polygon points="18,7 24,26 18,22 12,26" fill="${color}" stroke="white" stroke-width="1.2"/>
      </g>
    </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20] });
}

function createDotIcon(color: string, size = 8) {
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px ${color}80"></div>`,
    className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  });
}

function createDestIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:transparent;border:2px solid ${color};box-shadow:0 0 6px ${color}60"></div>`,
    className: '', iconSize: [12, 12], iconAnchor: [6, 6],
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

        const originDiff = Math.abs(p.originLat! - p.lat) > 0.001 || Math.abs(p.originLng! - p.lng) > 0.001;
        const destDiff = Math.abs(p.destLat! - p.lat) > 0.001 || Math.abs(p.destLng! - p.lng) > 0.001;

        if (originDiff) {
          const line = L.polyline([origin, current], { color, weight: 2, opacity: 0.3 });
          map.addLayer(line);
          layersRef.current.push(line);
          const dot = L.marker(origin, { icon: createDotIcon(color, 8) });
          map.addLayer(dot);
          layersRef.current.push(dot);
        }
        if (destDiff) {
          const line = L.polyline([current, dest], { color, weight: 2.5, opacity: 0.9, dashArray: '8 6' });
          map.addLayer(line);
          layersRef.current.push(line);
          const dot = L.marker(dest, { icon: createDestIcon(color) });
          map.addLayer(dot);
          layersRef.current.push(dot);
        }
      }

      const marker = L.marker([p.lat, p.lng], { icon });
      const popupContent = `
        <div style="font-family:monospace;min-width:180px;padding:4px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${p.make} ${p.model}</div>
          <div style="color:#888;font-size:10px;margin-bottom:8px">${p.vin}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px">
            <div><span style="color:#888">STATUS</span><br/><span style="color:${color};font-weight:600">${status}</span></div>
            <div><span style="color:#888">SPEED</span><br/>${p.speed ?? 0} km/h</div>
            <div><span style="color:#888">HEADING</span><br/>${p.heading ?? 0}°</div>
            <div><span style="color:#888">PROGRESS</span><br/>${Math.round((p.progress ?? 0) * 100)}%</div>
          </div>
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid #333;color:#888;font-size:9px">
            Last ping: ${new Date(p.lastUpdated).toLocaleTimeString()}
          </div>
        </div>`;
      marker.bindPopup(popupContent, { maxWidth: 220 });
      map.addLayer(marker);
      layersRef.current.push(marker);
    });

    if (points.length > 0) {
      const allLatlngs: [number, number][] = points.flatMap(p => {
        const pts: [number, number][] = [[p.lat, p.lng]];
        if (p.destLat != null && p.destLng != null) pts.push([p.destLat, p.destLng]);
        return pts;
      });
      if (allLatlngs.length > 0) {
        try { map.fitBounds(L.latLngBounds(allLatlngs), { padding: [60, 60], maxZoom: 10 }); } catch {}
      }
    }

    return () => { layersRef.current.forEach(l => map.removeLayer(l)); };
  }, [points, map]);

  return null;
}

export default function DistributorTracking() {
  const { user } = useAuthStore();
  const distributorId = user?.distributorId;

  const { data: trackingPoints, isLoading } = useGetTracking(
    { distributorId },
    { query: { queryKey: getGetTrackingQueryKey({ distributorId }), enabled: !!distributorId, refetchInterval: 30_000 } }
  );

  const inTransit = trackingPoints?.filter(p => p.status === 'In Transit').length ?? 0;
  const totalProgress = trackingPoints && trackingPoints.length > 0
    ? trackingPoints.reduce((s, p) => s + (p.progress ?? 0), 0) / trackingPoints.length
    : 0;

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inbound Tracking</h1>
          <p className="text-muted-foreground font-mono mt-1">INBOUND_LOGISTICS</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-1">INBOUND_VEHICLES</p>
                  <p className="text-2xl font-bold font-mono">{trackingPoints?.length ?? 0}</p>
                </div>
                <Package className="w-7 h-7 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-1">ACTIVE_TRANSIT</p>
                  <p className="text-2xl font-bold font-mono text-orange-400">{inTransit}</p>
                </div>
                <Navigation className="w-7 h-7 text-orange-400/40" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-1">AVG_PROGRESS</p>
                  <p className="text-2xl font-bold font-mono">{Math.round(totalProgress * 100)}%</p>
                </div>
                <Activity className="w-7 h-7 text-primary/40" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border overflow-hidden bg-card">
          <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Inbound Shipments ({trackingPoints?.length ?? 0})
              <span className="ml-auto text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                LIVE
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-0">
            {isLoading ? (
              <div className="h-[500px] flex items-center justify-center text-muted-foreground font-mono text-sm bg-muted/10">
                LOADING_TELEMETRY...
              </div>
            ) : trackingPoints && trackingPoints.length > 0 ? (
              <MapContainer
                center={[45, 20]}
                zoom={3}
                style={{ height: '500px', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <RouteLayer points={trackingPoints as TrackingPoint[]} />
              </MapContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground font-mono text-sm bg-muted/10">
                NO_INBOUND_SHIPMENTS
              </div>
            )}
          </CardContent>
        </Card>

        {trackingPoints && trackingPoints.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="py-3 border-b border-border/50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Shipment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {trackingPoints.map(p => {
                  const status = p.status ?? 'Unknown';
                  const color = STATUS_COLORS[status] ?? '#6b7280';
                  return (
                    <div key={p.vehicleId} className="px-5 py-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 5px ${color}80` }} />
                        <span className="font-medium text-sm">{p.make} {p.model}</span>
                        <span className="font-mono text-xs text-muted-foreground">{p.vin}</span>
                        <Badge variant="outline" className="ml-auto font-mono text-[9px]" style={{ color, borderColor: `${color}50` }}>
                          {status.toUpperCase().replace(/ /g, '_')}
                        </Badge>
                      </div>
                      <div className="ml-5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.round((p.progress ?? 0) * 100)}%`, background: color }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                            {Math.round((p.progress ?? 0) * 100)}%
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs font-mono text-muted-foreground">
                          <span>{p.speed ?? 0} km/h</span>
                          <span>HDG {p.heading ?? 0}°</span>
                        </div>
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
