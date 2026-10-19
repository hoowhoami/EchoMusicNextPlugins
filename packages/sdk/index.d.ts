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
  }
  export interface EchoPluginPlayer {
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
    readonly id: string;
    readonly installationId: string;
    readonly activationGeneration: string;
    readonly contextId: 'main';
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
