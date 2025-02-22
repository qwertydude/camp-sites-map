```mermaid
classDiagram
    class CampSiteMap {
        -mapboxgl: MapboxGL
        -markers: Map<string, Marker>
        -currentRouteLayer: Layer
        -popups: Array<Popup>
        +initializeMap(position)
        +updateMarkers(sites)
        +calculateRoute(start, end)
        +handleStyleChange(style)
        +handleTravelModeChange(mode)
    }

    class MapboxGL {
        +Map
        +Marker
        +Popup
        +Layer
        +accessToken: string
    }

    class CampSitesStore {
        -sites: Array<Site>
        +subscribe()
        +initialize()
        +loadSites()
        +addSite(site)
        +updateSite(site)
        +deleteSite(id)
    }

    class SettingsStore {
        -settings: Settings
        +subscribe()
        +initialize()
        +updateSettings(settings)
        +applyTheme(theme)
    }

    CampSiteMap --> MapboxGL : uses
    CampSiteMap --> CampSitesStore : subscribes
    CampSiteMap --> SettingsStore : subscribes

```

```mermaid
sequenceDiagram
    participant U as User
    participant CM as CampSiteMap
    participant MB as Mapbox
    participant DB as Supabase
    participant S as Stores

    U->>CM: Open Application
    CM->>S: Initialize Stores
    S->>DB: Load Settings & Sites
    CM->>MB: Initialize Map
    MB-->>CM: Map Instance
    
    U->>CM: Select Location
    CM->>MB: Get Coordinates
    MB-->>CM: Location Data
    CM->>DB: Save Location
    
    U->>CM: Request Route
    CM->>MB: Calculate Route
    MB-->>CM: Route Data
    CM->>CM: Display Route

```

```mermaid
stateDiagram-v2
    [*] --> Initializing
    Initializing --> LoadingMapbox: Map Container Ready
    LoadingMapbox --> MapReady: Mapbox Loaded
    
    MapReady --> CalculatingRoute: Route Requested
    CalculatingRoute --> DisplayingRoute: Route Calculated
    DisplayingRoute --> MapReady: Route Displayed
    
    MapReady --> UpdatingMarkers: Sites Changed
    UpdatingMarkers --> MapReady: Markers Updated
    
    MapReady --> ChangingStyle: Style Change
    ChangingStyle --> MapReady: Style Applied
```
