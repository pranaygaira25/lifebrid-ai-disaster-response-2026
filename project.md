# LifeBridge AI — Project Architecture & Flows

LifeBridge AI is an interactive, browser-based emergency command dashboard and disaster assistant. Localized for **Bangalore, India**, it provides real-time mapping, offline-resilient utilities, AI-driven guidance, and volunteer coordination for citizens and first responders during crises like floods, cyclones, and road accidents.

---

## 🛠️ System Modules & Features

1. **Live Emergency Metrics**: Displays active open shelters, hazard pins, available hospital beds, and registered volunteers.
2. **Dynamic Leaflet Map**: Implements thematic dark maps, customized vector SVGs for markers, and layer filtering.
3. **Dijkstra Safe Pathfinder**: A street-network grid algorithm that calculates path directions avoiding active hazard zones.
4. **NLP Emergency Assistant**: Rules-based chatbot that suggests resources, answers first aid queries, and reads instructions out loud using Web Speech Synthesis.
5. **Preparedness checklists**: Persistent inventories for Floods, Earthquakes, Cyclones, and Road Accidents.
6. **Missing Persons Catalog**: Crowd-sourced catalog with search indexing and status flags.
7. **Interactive Drills**: Branching choice-based training drills to teach citizens survival protocols.
8. **SOS Distress Siren**: Local synthetic dual-tone siren wails utilizing the Web Audio API.

---

## 🔄 User Interaction Flow

This diagram traces the entry pathways, actions, and output channels for Citizens and First Responders:

```mermaid
graph TD
    %% User Roles
    Citizen[Citizen User]
    Responder[First Responder / Dispatcher]
    
    %% Citizen Actions
    Citizen -->|1. Double click Map| HazardForm[Report Roadblock / Flood]
    Citizen -->|2. Activate Header SOS| SOSModal[SOS overlay + Siren Synth]
    Citizen -->|3. Input text query| Chatbot[AI Chat Agent]
    Citizen -->|4. Tick supply items| Storage[(Local Storage)]
    Citizen -->|5. Open Training Tab| Drills[Choice-Based Drills]
    
    %% Responder Actions
    Responder -->|6. Open Responder Portal| Term[Dispatcher terminal]
    Term -->|Resolve Alert| ClearHaz[Clear Blockage / SOS]
    Term -->|Submit Shelter form| AddMap[Place Shelter Pin]
    
    %% Backend/State Reactions
    HazardForm -->|Update State| MapView[Leaflet Map Layer]
    ClearHaz -->|Re-route edge cost| Pathfinder[Dijkstra Router]
    AddMap -->|Redraw markers| MapView
    Chatbot -->|TTS playback| Voice[Web Speech Synthesis]
```

---

## 🧭 Dijkstra Safe Pathfinder Algorithm Flow

This flowchart illustrates the calculations performed when a user requests a safe path between two points:

```mermaid
flowchart TD
    Start[User selects Start & End nodes on Map] --> CheckHazards[Retrieve active hazards from Global State]
    CheckHazards --> MapEdges[Iterate through street network edges]
    
    %% Proximity check loop
    MapEdges --> CalcDist{Is edge midpoint within 300m of any active hazard?}
    CalcDist -- Yes --> BlockEdge[Flag edge as blocked / set weight to Infinity]
    CalcDist -- No --> KeepEdge[Keep edge distance weight as actual km]
    
    %% Dijkstra
    BlockEdge --> InitDijkstra[Initialize distance array to Infinity and previous array to Null]
    KeepEdge --> InitDijkstra
    
    InitDijkstra --> Solve{Run Dijkstra Search}
    Solve --> PathExists{Is shortest path distance < Infinity?}
    
    %% Outcomes
    PathExists -- Yes --> DrawGreen[Draw neon-green route line on Map]
    DrawGreen --> OutputDirections[Output step-by-step street directions]
    
    PathExists -- No --> ShowError[Display 'All streets blocked' red alert banner]
    
    OutputDirections --> EndNode[End Pathfinding]
    ShowError --> EndNode
```

---

## 🎒 Offline Resiliency Flow

When the connection is cut, the application dynamically shifts to offline fallback mode:

```mermaid
sequenceDiagram
    autonowebpage->>User: Loads LifeBridge AI App
    Note over User,App: User toggles 'Offline Simulator' ON
    App->>App: Sets state.isOffline = true
    App->>Map: Lowers Tile Layer Opacity to 30% (indicates offline grid)
    App->>Notification: Triggers toast warning: "Local Grid Active"
    Note over App,Storage: Reads checklists, shelters & missing reports from localStorage
    User->>App: Submits Emergency Query
    App->>AI Agent: Routes query to local heuristics parser
    AI Agent-->>User: Returns advice & maps locally cached pins
```
