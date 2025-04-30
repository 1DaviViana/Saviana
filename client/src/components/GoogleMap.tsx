/// <reference types="@types/google.maps" />


import { useState, useEffect } from "react";
import { SearchResult } from "@shared/schema";
import { MapPin } from "@/components/ui/map-pin";

// Definir tipos do Google Maps para evitar erros de TypeScript
declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        Marker: any;
        InfoWindow: any;
        LatLngBounds: any;
        Animation: {
          DROP: any;
        };
        ControlPosition: {
          RIGHT_BOTTOM: any;
        };
      }
    };
  }
}

interface GoogleMapProps {
  locations: Array<{
    name: string;
    location?: { lat: number; lng: number };
  }>;
}

export default function GoogleMap({ locations }: GoogleMapProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY || ''}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setLoaded(true);
      script.onerror = () => setError(true);
      document.head.appendChild(script);
    };

    if (!window.google) {
      loadGoogleMapsScript();
    } else {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || !locations.length || error) return;

    try {
      // Clean up previous markers
      markers.forEach(marker => marker.setMap(null));
      setMarkers([]);

      const mapElement = document.getElementById("map");
      if (!mapElement) return;

      // Filter locations with valid coordinates
      const validLocations = locations.filter(
        loc => loc.location && loc.location.lat && loc.location.lng
      );

      if (validLocations.length === 0) return;

      // Initialize the map if it doesn't exist
      let mapInstance = map;
      if (!mapInstance) {
        const firstLocation = validLocations[0];
        mapInstance = new google.maps.Map(mapElement, {
          center: {
            lat: firstLocation.location!.lat,
            lng: firstLocation.location!.lng,
          },
          zoom: 13,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
        });
        setMap(mapInstance);
      }

      // Create bounds to fit all markers
      const bounds = new google.maps.LatLngBounds();

      // Add markers for each location
      const newMarkers = validLocations.map(location => {
        const position = {
          lat: location.location!.lat,
          lng: location.location!.lng,
        };
        
        bounds.extend(position);
        
        const marker = new google.maps.Marker({
          position,
          map: mapInstance,
          title: location.name,
          animation: google.maps.Animation.DROP,
        });
        
        const infoWindow = new google.maps.InfoWindow({
          content: `<div><b>${location.name}</b></div>`,
        });

        marker.addListener("click", () => {
          infoWindow.open(mapInstance, marker);
        });

        return marker;
      });

      setMarkers(newMarkers);

      // Fit the map to show all markers
      if (newMarkers.length > 1) {
        mapInstance?.fitBounds(bounds);
      }
    } catch (err) {
      console.error("Error initializing Google Maps:", err);
      setError(true);
    }
  }, [loaded, locations, map]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
        Não foi possível carregar o mapa
      </div>
    );
  }

  if (!loaded || !locations.some(loc => loc.location)) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="relative">
          {locations.slice(0, 2).map((location, index) => (
            <div key={index} className={`absolute ${index === 0 ? 'top-[-30px] left-[-30px]' : 'top-[10px] right-[-40px]'}`}>
              <MapPin name={location.name} />
            </div>
          ))}
          <div className="animate-pulse bg-gray-200 rounded-lg h-full w-full">
            <div className="h-[200px] w-full rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return <div id="map" className="w-full h-full" />;
}
