"use client";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";

export default function MiniMapa({ lat, lng, nome, altura = 180 }: { lat: number; lng: number; nome: string; altura?: number }) {
  return (
    <MapContainer center={[lat, lng]} zoom={14} scrollWheelZoom={false} dragging={false} zoomControl={false} style={{ height: altura, width: "100%" }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" className="tiles-suaves" />
      <CircleMarker center={[lat, lng]} radius={9} pathOptions={{ color: "#fff", weight: 2, fillColor: "#17407a", fillOpacity: 1 }}>
        <Tooltip permanent direction="top" offset={[0, -8]}>{nome}</Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}
