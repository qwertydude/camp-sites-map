classDiagram
    class CampSiteMap {
        -map: LeafletMap
        -markers: Marker[]
        -settings: Settings
        +initialize()
        +addMarker()
        +updateSettings()
        +clearMarkers()
    }

    class SettingsPanel {
        -settings: Settings
        -visible: boolean
        +togglePanel()
        +updateSettings()
        +saveSettings()
    }

    class SitesPanel {
        -sites: Site[]
        -visible: boolean
        +togglePanel()
        +loadSites()
        +filterSites()
    }

    CampSiteMap --> SettingsPanel
    CampSiteMap --> SitesPanel

---

sequenceDiagram
    participant U as User
    participant M as Map
    participant S as Supabase
    participant P as Panels

    U->>M: Open Application
    M->>S: Load Site Data
    S-->>M: Return Sites
    M->>M: Initialize Map
    M->>P: Update Panels
    
    U->>P: Toggle Settings
    P->>M: Update Map Settings
    M->>M: Refresh Display

    U->>P: Filter Sites
    P->>M: Update Markers
    M->>M: Refresh Map

---

stateDiagram-v2
    [*] --> Loading
    Loading --> MapInitialized
    MapInitialized --> LoadingSites
    LoadingSites --> Ready
    
    Ready --> UpdatingSettings
    UpdatingSettings --> Ready
    
    Ready --> FilteringSites
    FilteringSites --> Ready
    
    Ready --> [*]
