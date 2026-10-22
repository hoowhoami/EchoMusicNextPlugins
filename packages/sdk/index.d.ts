/// <reference path="./globals.d.ts" />
/** Qt 6.12 authoring contract. Compile source to the supported ECMAScript syntax;
 * this declaration adds no Node, Electron or browser runtime. */
declare module 'echo:plugin-sdk' {
  export type JsonValue =
    null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
  export interface QtSignal<Arguments extends unknown[] = []> {
    connect(callback: (...args: Arguments) => void): void;
    disconnect(callback: (...args: Arguments) => void): void;
  }
  export type OperationState = 0 | 1 | 2 | 3 | 4;
  export interface EchoPluginOperation<Result = void> {
    readonly id: string;
    readonly state: OperationState;
    readonly result: Result;
    readonly errorCode: string;
    readonly errorMessage: string;
    readonly changed: QtSignal;
    readonly completed: QtSignal;
    cancel(): void;
  }
  export function awaitOperation<Result>(operation: EchoPluginOperation<Result>): Promise<Result>;
  export interface PluginServiceMethod {
    arguments: Record<string, JsonValue>;
    result: JsonValue | void;
  }
  export interface PluginServiceClient<
    Contract extends { [K in keyof Contract]: PluginServiceMethod },
  > {
    call<Method extends keyof Contract & string>(
      method: Method,
      arguments: Contract[Method]['arguments'],
    ): Promise<Contract[Method]['result']>;
  }
  export function pluginService<Contract extends { [K in keyof Contract]: PluginServiceMethod }>(
    context: EchoPluginContext,
    pluginId: string,
    serviceId: string,
    versionRange: string,
  ): PluginServiceClient<Contract>;
  export interface EchoPluginRegistry {
    readonly availabilityChanged: QtSignal;
    isAvailable(pluginId: string): boolean;
    version(pluginId: string): string;
    serviceVersion(pluginId: string, serviceId: string): string;
    registerService(
      id: string,
      version: string,
      methods: Record<
        string,
        (arguments: Record<string, JsonValue>) => JsonValue | void | Promise<JsonValue | void>
      >,
    ): EchoPluginRegistration | null;
    call<Result = JsonValue>(
      pluginId: string,
      serviceId: string,
      versionRange: string,
      method: string,
      arguments?: Record<string, JsonValue>,
    ): EchoPluginOperation<Result>;
  }
  export interface EchoPluginRegistration {
    readonly key: string;
    readonly revision: string;
    readonly active: boolean;
    readonly activeChanged: QtSignal;
    dispose(): void;
  }
  /** Opaque Qt values preserve their complete host font/model semantics. */
  export interface QtFont {
    readonly __qtFont: unique symbol;
  }
  export interface QtColor {
    readonly __qtColor: unique symbol;
  }
  export interface EchoPluginReadModel {
    readonly __qtListModel: unique symbol;
    row(index: number): Record<string, unknown>;
  }
  export interface QtRect {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }
  export interface AppearanceConfiguration {
    readonly values: Record<string, JsonValue>;
    readonly defaults: Record<string, JsonValue>;
    readonly errorMessage: string;
    readonly active: boolean;
    readonly busy: boolean;
    readonly changed: QtSignal;
    readonly errorChanged: QtSignal;
    readonly busyChanged: QtSignal;
    readonly drained: QtSignal;
    patch(values: Record<string, JsonValue>): boolean;
    reset(): boolean;
  }
  export interface AppearanceDefinition {
    id: string;
    title: string;
    description?: string;
    preview?: string;
    component?: string;
    backgroundComponent?: string;
    sidebarComponent?: string;
    playerComponent?: string;
    miniComponent?: string;
    miniBackgroundComponent?: string;
    settingsComponent?: string;
    titlebar?: 'host' | 'none';
    tools?: 'host' | 'none';
    type?: 'default' | 'solid' | 'dynamic';
    defaultMode?: 'system' | 'light' | 'dark';
    light?: Record<string, JsonValue>;
    dark?: Record<string, JsonValue>;
    defaults?: Record<string, JsonValue>;
    validate?: (values: Record<string, JsonValue>) => boolean | { errors?: string[] };
    resolve?: (state: Record<string, JsonValue>) => Record<string, JsonValue>;
  }
  export interface SkinDefinition extends AppearanceDefinition {
    component: string;
  }
  export interface EchoPluginAppearanceHandle {
    readonly key: string;
    readonly active: boolean;
    readonly configuration: AppearanceConfiguration;
    readonly changed: QtSignal;
    dispose(): void;
  }
  export interface EchoPluginAppearance {
    readonly snapshot: Record<string, unknown>;
    readonly errorMessage: string;
    readonly changed: QtSignal;
    registerTheme(definition: AppearanceDefinition): EchoPluginAppearanceHandle | null;
    registerSkin(definition: SkinDefinition): EchoPluginAppearanceHandle | null;
    useTheme(id: string): boolean;
    useSkin(id: string): boolean;
    previewTheme(id: string): boolean;
    cancelPreview(): void;
    openThemes(): void;
    openSkins(): void;
  }
  export interface EchoPluginFonts {
    readonly families: string[];
    build(families: string[], pixelSize?: number, weight?: number, letterSpacing?: number): QtFont;
  }
  export interface EchoPluginViewContext {
    readonly active: boolean;
    readonly surface: string;
    readonly player: EchoPluginPlayer;
    readonly snapshot: Record<string, unknown>;
    readonly changed: QtSignal;
    command(action: string, arguments?: Record<string, JsonValue>): EchoPluginOperation;
  }
  export interface EchoPluginWindows {
    readonly snapshot: Record<string, unknown>;
    readonly changed: QtSignal;
    command(
      target: 'mini' | 'desktop',
      action: string,
      arguments?: Record<string, JsonValue>,
    ): EchoPluginOperation;
  }
  export interface EchoUiPartRef {
    readonly id: string;
    readonly revision: string;
    readonly role: string;
    readonly key: string;
    readonly surface: string;
    readonly window: string;
    readonly valid: boolean;
    readonly visible: boolean;
    readonly geometry: QtRect;
    readonly visuals: Record<string, unknown>;
    readonly properties: string[];
    readonly actions: string[];
    readonly replaceable: boolean;
    readonly changed: QtSignal;
    readonly invalidated: QtSignal;
    readonly eventOccurred: QtSignal<[event: string, payload: Record<string, JsonValue>]>;
    invoke(action: string, arguments?: Record<string, JsonValue>): EchoPluginOperation;
  }
  export interface EchoUiPartMount {
    readonly active: boolean;
    readonly loaded: boolean;
    readonly errorMessage: string;
    readonly position: string;
    readonly changed: QtSignal;
    dispose(): void;
  }
  export interface EchoPluginUiParts {
    readonly errorMessage: string;
    readonly errorChanged: QtSignal;
    query(selector?: Record<string, JsonValue>): EchoUiPartRef | null;
    queryAll(selector?: Record<string, JsonValue>): EchoUiPartRef[];
    observe(
      id: string,
      selector: Record<string, JsonValue>,
      callback: (event: {
        type: 'added' | 'changed' | 'removed' | 'event';
        part: EchoUiPartRef;
        event: string;
        payload: Record<string, JsonValue>;
      }) => void,
      immediate?: boolean,
    ): EchoPluginRegistration | null;
    mount(
      id: string,
      part: EchoUiPartRef,
      position: string,
      component: string,
      priority?: number,
    ): EchoUiPartMount | null;
  }
  export interface EchoUiStyleRule {
    readonly key: string;
    readonly revision: string;
    readonly active: boolean;
    readonly priority: number;
    readonly values: Record<string, JsonValue>;
    readonly changed: QtSignal;
    update(values: Record<string, JsonValue>): boolean;
    setPriority(priority: number): boolean;
    dispose(): void;
  }
  export interface EchoPluginUiStyles {
    readonly errorMessage: string;
    readonly errorChanged: QtSignal;
    registerRule(
      id: string,
      selector: Record<string, JsonValue>,
      values: Record<string, JsonValue>,
      priority?: number,
    ): EchoUiStyleRule | null;
  }
  export interface EchoPluginPlayer {
    readonly snapshot: Record<string, unknown>;
    readonly lyricsInfo: Record<string, JsonValue>;
    readonly revision: string;
    readonly title: string;
    readonly artist: string;
    readonly album: string;
    readonly coverUrl: { toString(): string };
    readonly loading: boolean;
    readonly hasTrack: boolean;
    readonly errorMessage: string;
    readonly playing: boolean;
    readonly positionMs: number;
    readonly durationMs: number;
    /** Host percentage, including amplification: 0..150. */
    readonly volume: number;
    /** Host playback rate: 0.1..5. */
    readonly speed: number;
    readonly queue: EchoPluginReadModel;
    readonly lyrics: EchoPluginReadModel;
    readonly changed: QtSignal;
    readonly positionChanged: QtSignal;
    readonly lyricChanged: QtSignal;
    readonly eventOccurred: QtSignal<[event: string, payload: Record<string, unknown>]>;
    lyricSnapshot(): Record<string, JsonValue>;
    control(action: string, arguments?: Record<string, JsonValue>): EchoPluginOperation;
    on(
      id: string,
      event: string,
      callback: (snapshot: Record<string, unknown>) => void,
      immediate?: boolean,
    ): EchoPluginRegistration | null;
    play(): EchoPluginOperation;
    pause(): EchoPluginOperation;
    toggle(): EchoPluginOperation;
    stop(): EchoPluginOperation;
    previous(): EchoPluginOperation;
    next(): EchoPluginOperation;
    seek(positionMs: number): EchoPluginOperation;
    setVolume(percent: number): EchoPluginOperation;
    setSpeed(rate: number): EchoPluginOperation;
    playIndex(row: number): EchoPluginOperation;
    remove(row: number): EchoPluginOperation;
    move(from: number, to: number): EchoPluginOperation;
    clear(): EchoPluginOperation;
  }
  export interface EchoPluginTask {
    readonly active: boolean;
    readonly activeChanged: QtSignal;
    readonly cancelRequested: QtSignal;
    setProgress(percent: number, label?: string): boolean;
    complete(): boolean;
    fail(message: string): boolean;
    abort(): boolean;
    dispose(): void;
  }
  export interface SpectrumOptions {
    fps?: number;
    binCount?: number;
    fftSize?: number;
    smoothing?: number;
    minFrequency?: number;
    maxFrequency?: number;
    scale?: 'log' | 'linear' | 'mel';
    includeWaveform?: boolean;
  }
  export interface SpectrumFrame {
    source: 'player' | 'silence' | 'unavailable';
    state: 'playing' | 'paused' | 'idle';
    timestamp: number;
    timePos?: number;
    sampleRate?: number;
    fftSize?: number;
    minFrequency?: number;
    maxFrequency?: number;
    bins: number[];
    waveform?: number[];
    rms: number;
    peak: number;
  }
  export interface SpectrumStatus {
    available: boolean;
    running: boolean;
    provider: 'player' | 'unavailable';
    reason: string;
    subscriberCount: number;
  }
  export interface EchoPluginSpectrumSubscription {
    readonly active: boolean;
    paused: boolean;
    readonly frame: SpectrumFrame | null;
    readonly status: SpectrumStatus;
    readonly activeChanged: QtSignal;
    readonly pausedChanged: QtSignal;
    readonly frameChanged: QtSignal;
    readonly statusChanged: QtSignal;
    setPaused(paused: boolean): void;
    dispose(): void;
  }
  export interface EchoPluginSpectrum {
    readonly status: SpectrumStatus;
    readonly statusChanged: QtSignal;
    subscribe(
      options?: Record<string, JsonValue> & SpectrumOptions,
    ): EchoPluginSpectrumSubscription | null;
    getStatus(): SpectrumStatus;
  }
  export interface EchoPluginAudio {
    readonly spectrum: EchoPluginSpectrum;
  }
  export interface EchoPluginUi {
    readonly lyricsPage: EchoPluginAppearance;
    readonly parts: EchoPluginUiParts;
    readonly styles: EchoPluginUiStyles;
    readonly state: Record<string, JsonValue>;
    readonly stateChanged: QtSignal;
    setState(values: Record<string, JsonValue>): boolean;
    registerSurface(
      id: string,
      target: 'playerbar.background' | 'mini.background' | 'lyrics.aboveControls',
      component: string,
    ): EchoPluginRegistration | null;
    readonly settingsComponent: string;
    readonly settingsChanged: QtSignal;
    registerSettings(packageRelativeQml: string): EchoPluginRegistration | null;
    registerPage(id: string, packageRelativeQml: string): EchoPluginRegistration | null;
    navigate(id: string, query?: Record<string, string>): EchoPluginOperation;
    registerTitlebarAction(
      id: string,
      title: string,
      icon: string,
      callback: () => unknown,
    ): EchoPluginRegistration | null;
    registerPlayerbarAction(
      id: string,
      title: string,
      icon: string,
      callback: () => unknown,
    ): EchoPluginRegistration | null;
    createTask(id: string, title: string): EchoPluginTask | null;
  }
  export interface HttpResponse {
    readonly status: number;
    readonly headers: Record<string, string>;
    readonly body: ArrayBuffer;
    readonly url: { toString(): string };
  }
  export interface EchoPluginIo {
    readonly drained: QtSignal;
    get(url: string): EchoPluginOperation<HttpResponse>;
    post(
      url: string,
      body: string | ArrayBuffer,
      contentType?: string,
    ): EchoPluginOperation<HttpResponse>;
    readValue(key: string): EchoPluginOperation<JsonValue | undefined>;
    writeValue(key: string, value: JsonValue): EchoPluginOperation;
    removeValue(key: string): EchoPluginOperation;
  }
  export interface EchoPluginContext {
    readonly theme: EchoPluginAppearance;
    readonly appearance: EchoPluginAppearance;
    readonly fonts: EchoPluginFonts;
    readonly windows: EchoPluginWindows;
    readonly id: string;
    readonly installationId: string;
    readonly activationGeneration: string;
    readonly contextId: string;
    readonly active: boolean;
    readonly audio: EchoPluginAudio;
    readonly player: EchoPluginPlayer;
    readonly ui: EchoPluginUi;
    readonly io: EchoPluginIo;
    readonly plugins: EchoPluginRegistry;
    readonly font: QtFont;
    readonly accent: QtColor;
    readonly dark: boolean;
    readonly activeChanged: QtSignal;
    readonly appearanceChanged: QtSignal;
    readonly resourcesDrained: QtSignal;
    readonly callbackFailed: QtSignal<[message: string]>;
    supports(feature: string): boolean;
    onDispose(callback: () => void): EchoPluginRegistration | null;
    setTimer(
      id: string,
      intervalMs: number,
      repeat: boolean,
      callback: () => void,
    ): EchoPluginRegistration | null;
    onPlayerChanged(id: string, callback: () => void): EchoPluginRegistration | null;
    registerCommand(
      id: string,
      callback: (
        arguments: Record<string, JsonValue>,
      ) => JsonValue | void | Promise<JsonValue | void>,
    ): EchoPluginRegistration | null;
    executeCommand(
      id: string,
      arguments?: Record<string, JsonValue>,
    ): EchoPluginOperation<JsonValue | void>;
  }
}
