declare namespace AMap {
  class Map {
    constructor(container: string | HTMLElement, options?: MapOptions);
    destroy(): void;
    add(overlay: any): void;
    remove(overlay: any): void;
    setFitView(overlays?: any[]): void;
    clearMap(): void;
    getZoom(): number;
    setZoom(zoom: number): void;
    getCenter(): LngLat;
    setCenter(center: LngLat | [number, number]): void;
  }

  interface MapOptions {
    viewMode?: '2D' | '3D';
    zoom?: number;
    pitch?: number;
    center?: [number, number];
    mapStyle?: string;
    [key: string]: any;
  }

  class Bounds {
    constructor(southWest?: LngLat | [number, number], northEast?: LngLat | [number, number]);
    extend(point: LngLat | [number, number]): void;
    isEmpty(): boolean;
    getSouthWest(): LngLat;
    getNorthEast(): LngLat;
  }

  class LngLat {
    constructor(lng: number, lat: number);
    getLng(): number;
    getLat(): number;
  }

  class Pixel {
    constructor(x: number, y: number);
  }

  class Polyline {
    constructor(options?: PolylineOptions);
  }

  interface PolylineOptions {
    path?: [number, number][];
    strokeColor?: string;
    strokeWeight?: number;
    lineJoin?: string;
    lineCap?: string;
    zIndex?: number;
    [key: string]: any;
  }

  class Marker {
    constructor(options?: MarkerOptions);
    on(event: string, callback: () => void): void;
    getPosition(): LngLat;
  }

  interface MarkerOptions {
    position?: [number, number];
    title?: string;
    offset?: Pixel;
    content?: string;
    [key: string]: any;
  }

  class InfoWindow {
    constructor(options?: InfoWindowOptions);
    open(map: Map, position: LngLat | [number, number]): void;
    close(): void;
  }

  interface InfoWindowOptions {
    content?: string | HTMLElement;
    offset?: Pixel;
    [key: string]: any;
  }
}
