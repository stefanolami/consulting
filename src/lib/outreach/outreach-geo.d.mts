import type { GeoProjection } from 'd3-geo'
import type { Feature, Geometry, MultiPoint, MultiPolygon } from 'geojson'

export type Point = [number, number]
export type Extent = [Point, Point]
export type MapConfig = { center: Point; zoom: number | null }
export type MapFrame = { anchor: Point; center: Point; rotation: number; scale: number }
export type OutlinePath = { d: string; viewBox: [number, number, number, number] }
export type CountryFeature = Feature<Geometry | null>

export declare const PRINCIPAL_RADIUS_DEGREES: number
export declare const MIN_ZOOM: number
export declare const MAX_ZOOM: number
export declare const SMALL_FEATURE_PX: number
export type LonLatBounds = [Point, Point]
export declare const REGION_CONTEXT: Readonly<Record<string, LonLatBounds>>

export declare function normalizeLongitude(longitude: number): number
export declare function featureNumericCode(feature: { id?: string | number | null } | null | undefined): string | null
export declare function principalShape(feature: CountryFeature | null | undefined, radiusDegrees?: number): Feature<MultiPolygon> | null
export declare function parseMapConfig(value: unknown): MapConfig | null
export declare function centerLongitude(features: readonly CountryFeature[]): number
export declare function extentCenter(extent: Extent): Point
export declare function fitFrame(features: readonly CountryFeature[], extent: Extent, rotation?: number, limits?: { minScale?: number; maxScale?: number }): MapFrame
export declare function boundsFeature(bounds: LonLatBounds, step?: number): Feature<MultiPoint>
export declare function regionFrame(options: { config: MapConfig | null; context?: LonLatBounds | null; extent: Extent; features: readonly CountryFeature[]; worldScale: number }): MapFrame | null
export declare function clampPan(bounds: [[number, number], [number, number]], delta: Point, size: { width: number; height: number }, keep?: number): Point
export declare function panFrame(frame: MapFrame, delta: Point): MapFrame
export declare function projectFrame(frame: MapFrame, size?: { width: number; height: number }): GeoProjection
export declare function interpolateFrame(from: MapFrame, to: MapFrame, t: number): MapFrame
export declare function easeInOutCubic(t: number): number
export type FeatureReach = { center: Point; radius: number }
export declare function featureReach(feature: CountryFeature | null | undefined): FeatureReach | null
export declare function mayBeVisible(projection: GeoProjection, reach: FeatureReach | null, size: { width: number; height: number }): boolean
export declare function isSmallBounds(bounds: [[number, number], [number, number]], threshold?: number): boolean
export declare function markerPoint(feature: CountryFeature): Point | null
export declare function outlinePath(feature: CountryFeature, size?: number): OutlinePath | null
