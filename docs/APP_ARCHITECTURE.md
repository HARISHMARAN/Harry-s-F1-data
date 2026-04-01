# Application Architecture Overview - App.tsx

## ViewMode State Management

The `ViewMode` in the `App.tsx` component is managed through React's state management, allowing users to toggle between different application states: **LIVE**, **HISTORICAL**, **REPLAY**, and **ADDONS**. Each mode represents a distinct functionality within the app:

- **LIVE**: Displays real-time telemetry data.
- **HISTORICAL**: Shows past race data.
- **REPLAY**: Provides a feature to replay previous races.
- **ADDONS**: Offers additional features or statistics.

The state is structured as follows:

```typescript
const [viewMode, setViewMode] = useState<ViewModeType>('LIVE');
```

## Data Flow Between Modes

Data flows differently depending on the current `ViewMode`. 

- **LIVE Mode**: Utilizes a polling mechanism to continuously fetch data from the server every few seconds.
- **HISTORICAL Mode**: Loads data from a static dataset or database on switch and allows user queries.
- **REPLAY Mode**: Fetches specific data points based on user-selected timestamps.
- **ADDONS Mode**: Integrates additional data inputs without interrupting the user experience.

## Polling Mechanism for Live Telemetry

The application employs a polling mechanism to obtain live telemetry data:

- A timer is set up to trigger data fetch calls every few seconds.
- If an error occurs during polling, an error handling strategy is activated to notify users and attempt reconnections.

Example code snippet for polling:

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchDataForLiveMode();
  }, POLLING_INTERVAL);

  return () => clearInterval(interval); // Cleanup on component unmount
}, []);
```

## Error Handling Strategy

The error handling involves:

- Capturing API errors and displaying user-friendly messages.
- Implementing retry mechanisms for transient issues.
- Logging errors for monitoring and debugging purposes.

## Component Hierarchy

The main component (`App.tsx`) includes the following hierarchy:

- `App`
  - `Header`
  - `ViewModeSwitcher`
  - `LiveTelemetry` (only in LIVE mode)
  - `HistoricalDataDisplay` (only in HISTORICAL mode)
  - `RaceReplayComponent` (only in REPLAY mode)
  - `AddonFeatures` (only in ADDONS mode)

This hierarchy enables a clear separation of concerns, adhering to best practices in React development.

## Integration Points with Services

The `App.tsx` integrates with several services:

- **Telemetry Service**: For fetching live data.
- **Database Service**: For retrieving historical data.
- **Logging Service**: For capturing errors and usage analytics.
- **Notification Service**: For providing user feedback in case of errors or significant events.

This architecture ensures a modular, maintainable, and scalable application structure, allowing for future enhancements and optimizations.
