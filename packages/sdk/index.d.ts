/// <reference path="./globals.d.ts" />
/** Qt 6.12 authoring contract. Compile source to the supported ECMAScript syntax;
 * this declaration adds no Node, Electron or browser runtime. */
declare module 'echo:plugin-sdk' {
  /** A curated index points at author-owned manifests and immutable .echomod bytes. */
  export interface PluginSourceEntry {
    id: string;
    /** GitHub repository URL; omitted for a package maintained in the index repository. */
    repo?: string;
    /** Branch, tag or commit; defaults to HEAD. */
    ref?: string;
    /** Manifest directory relative to the author repository; empty means repository root. */
    path: string;
    /** Repository-relative package path or an absolute HTTPS .echomod URL. */
    artifact: string;
    sha256: string;
  }
  export interface PluginSourceIndex {
    schemaVersion: 2;
    plugins: PluginSourceEntry[];
  }
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
  export interface PluginTrack {
    readonly id: string;
    readonly hash: string;
    readonly sourceId: string;
    readonly data: Record<string, JsonValue>;
    readonly title: string;
    readonly artist: string;
    readonly artistLinks: JsonValue[];
    readonly album: string;
    readonly albumId: string;
    readonly songId: string;
    readonly cover: string;
    readonly durationMs: number;
  }
  export interface LyricLineSnapshot {
    readonly lineText: string;
    readonly startMs: number;
    readonly durationMs: number;
    readonly words: JsonValue[];
    readonly translation: string;
    readonly romanization: string;
    readonly filtered: boolean;
    readonly wordTimed: boolean;
  }
  export interface LyricsInfo {
    readonly count: number;
    readonly currentIndex: number;
    readonly offsetMs: number;
    readonly scrollable: boolean;
    readonly hasTranslation: boolean;
    readonly hasRomanization: boolean;
    readonly translation: boolean;
    readonly romanization: boolean;
    readonly conversion: string;
    readonly globalOffsetMs: number;
    readonly trackOffsetMs: number;
    readonly offsetStep: number;
    readonly state: string;
    readonly currentLine: Partial<LyricLineSnapshot>;
  }
  export interface LyricsSnapshot extends LyricsInfo {
    readonly lines: LyricLineSnapshot[];
    readonly revision: string;
  }
  export interface PlaybackSnapshot {
    readonly revision: string;
    readonly track: PluginTrack;
    readonly title: string;
    readonly artist: string;
    readonly album: string;
    readonly cover: { toString(): string };
    readonly coverColor: QtColor;
    readonly playing: boolean;
    readonly loading: boolean;
    readonly hasTrack: boolean;
    readonly positionMs: number;
    readonly durationMs: number;
    readonly volume: number;
    readonly speed: number;
    readonly playMode: 0 | 1 | 2 | 3;
    readonly quality: string;
    readonly effectiveQuality: string;
    readonly resolvedQuality: string;
    readonly effect: string;
    readonly appliedEffect: string;
    readonly sourceKind: string;
    readonly sourceNotice: string;
    readonly sourceNoticeCode: string;
    readonly favorite: boolean;
    readonly favoriteBusy: boolean;
    readonly personalFm: boolean;
    readonly fm: {
      readonly signedIn: boolean;
      readonly busy: boolean;
      readonly mode: number;
      readonly songPool: number;
      readonly current: Record<string, JsonValue>;
      readonly sideTracks: JsonValue[];
      readonly currentPlaying: boolean;
      readonly errorMessage: string;
    };
    readonly errorMessage: string;
    readonly lyrics: LyricsInfo;
  }
  export type PlaybackEvent =
    'trackchange' | 'statechange' | 'play' | 'pause' | 'ended' | 'seek' | 'error' | 'timeupdate';
  export type PresentationCommand =
    | 'play'
    | 'pause'
    | 'toggle'
    | 'stop'
    | 'previous'
    | 'next'
    | 'seek'
    | 'volume'
    | 'speed'
    | 'mode'
    | 'quality'
    | 'effect'
    | 'favorite'
    | 'fmPlay'
    | 'fmMode'
    | 'fmPool'
    | 'globalOffset'
    | 'offsetStep'
    | 'dislikeFm'
    | 'translation'
    | 'romanization'
    | 'conversion'
    | 'offset'
    | 'resetOffset'
    | 'copyLyrics'
    | 'themes'
    | 'source'
    | 'settings'
    | 'skins'
    | 'closePlayback'
    | 'playback'
    | 'comments'
    | 'barrage'
    | 'queue'
    | 'addToPlaylist'
    | 'share';
  export interface PresentationArguments {
    value?: number | string | boolean;
    revision?: string;
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
    /** Validate the merged object, enqueue an atomic private-data write. Observe
     * busy/errorMessage; values changes only after persistence succeeds. */
    patch(values: Record<string, JsonValue>): boolean;
    reset(): boolean;
  }
  export interface ThemePalette {
    shell?: string;
    sidebar?: string;
    main?: string;
    player?: string;
    card?: string;
    elevated?: string;
    text?: string;
    secondaryText?: string;
    border?: string;
    accent?: string;
  }
  export interface SurfacePalette {
    background?: string;
    text?: string;
    secondaryText?: string;
    card?: string;
    border?: string;
    accent?: string;
    accentText?: string;
  }
  export interface GradientDefinition {
    color?: string;
    stops?: { position: number; color: string }[];
    angle?: number;
    opacity?: number;
    height?: number;
  }
  export interface BackgroundDefinition {
    kind: 'color' | 'gradient' | 'image' | 'video';
    color?: string;
    stops?: { position: number; color: string }[];
    angle?: number;
    /** Package-relative asset; never a signed stream URL or application path. */
    source?: string;
    fit?: 'cover' | 'contain';
    opacity?: number;
    shade?: number;
    shadeColor?: string;
  }
  export interface PageTransitionDefinition {
    enabled?: boolean;
    mode?: 'parallel' | 'out-in' | 'in-out';
    durationMs?: number;
    enterOpacity?: number;
    leaveOpacity?: number;
    enterScale?: number;
    leaveScale?: number;
    enterX?: number;
    enterY?: number;
    leaveX?: number;
    leaveY?: number;
  }
  export interface ThemeVariant {
    palette?: ThemePalette;
    floating?: SurfacePalette;
    mini?: SurfacePalette;
    background?: BackgroundDefinition;
    surface?: Partial<
      Record<'shell' | 'main' | 'sidebar' | 'player' | 'card' | 'elevated', number>
    >;
    accentGradient?: GradientDefinition;
    pageTransition?: PageTransitionDefinition;
  }
  export interface ThemeDefinition {
    type?: 'default' | 'solid' | 'dynamic';
    defaultMode?: 'system' | 'light' | 'dark';
    id: string;
    title: string;
    description?: string;
    preview?: string;
    light?: ThemeVariant;
    dark?: ThemeVariant;
    component?: string;
    backgroundComponent?: string;
    sidebarComponent?: string;
    playerComponent?: string;
    miniComponent?: string;
    miniBackgroundComponent?: string;
    settingsComponent?: string;
    defaults?: Record<string, JsonValue>;
    validate?: (values: Record<string, JsonValue>) => boolean | { errors?: string[] };
    resolve?: (context: {
      dark: boolean;
      coverColor: string;
      settings: Record<string, JsonValue>;
    }) => ThemeVariant;
  }
  export interface SkinDefinition {
    id: string;
    title: string;
    description?: string;
    preview?: string;
    component: string;
    titlebar?: 'host' | 'none';
    tools?: 'host' | 'none';
    settingsComponent?: string;
    defaults?: Record<string, JsonValue>;
    validate?: (values: Record<string, JsonValue>) => boolean | { errors?: string[] };
  }
  export interface AppearanceSnapshot {
    readonly dark: boolean;
    readonly font: QtFont;
    readonly lyricFont: QtFont;
    readonly miniFont: QtFont;
    readonly desktopFont: QtFont;
    readonly accent: QtColor;
    readonly text: QtColor;
    readonly secondaryText: QtColor;
    readonly shell: QtColor;
    readonly sidebar: QtColor;
    readonly main: QtColor;
    readonly player: QtColor;
    readonly card: QtColor;
    readonly elevated: QtColor;
    readonly border: QtColor;
    readonly floating: Readonly<Record<string, QtColor>>;
    readonly motionEnabled: boolean;
    readonly transparency: number;
    readonly windowFrosted: boolean;
    readonly floatingFrosted: boolean;
    readonly selectedTheme: string;
    readonly selectedSkin: string;
    readonly surfaces: ThemeVariant;
  }
  export interface EchoPluginAppearanceHandle {
    readonly key: string;
    readonly active: boolean;
    readonly configuration: AppearanceConfiguration | null;
    readonly changed: QtSignal;
    dispose(): void;
  }
  export interface EchoPluginAppearance {
    readonly snapshot: AppearanceSnapshot;
    readonly errorMessage: string;
    readonly changed: QtSignal;
    registerTheme(definition: ThemeDefinition): EchoPluginAppearanceHandle | null;
    registerSkin(definition: SkinDefinition): EchoPluginAppearanceHandle | null;
    useTheme(id: string): boolean;
    useSkin(id: string): boolean;
    previewTheme(id: string): boolean;
    cancelPreview(): void;
    openThemes(): void;
    openSkins(): void;
  }
  export interface EchoPluginFonts {
    readonly families: readonly string[];
    build(families: string[], pixelSize?: number, weight?: number, letterSpacing?: number): QtFont;
  }
  export interface EchoPluginViewContext {
    readonly active: boolean;
    readonly surface: string;
    readonly player: EchoPluginPlayer;
    readonly snapshot: PlaybackSnapshot;
    readonly changed: QtSignal;
    command(action: PresentationCommand, arguments?: PresentationArguments): EchoPluginOperation;
  }
  export interface FloatingWindowsSnapshot {
    readonly available: boolean;
    readonly miniActive?: boolean;
    readonly desktopEnabled?: boolean;
    readonly locked?: boolean;
    readonly panel?: string;
    readonly mini?: Record<string, JsonValue>;
    readonly desktop?: Record<string, JsonValue>;
    readonly miniBounds?: Partial<QtRect>;
    readonly desktopBounds?: Partial<QtRect>;
  }
  export type ResourceCapability =
    | 'tcp'
    | 'webServer'
    | 'windows'
    | 'process'
    | 'serverIntercept'
    | 'navigation'
    | 'hostSettings'
    | 'cover';
  export interface ResourcePermission {
    readonly id: string;
    readonly installationId: string;
    readonly pluginName: string;
    readonly capability: ResourceCapability;
    readonly name: string;
    readonly contentHash: string;
    readonly resource?: string;
  }
  export interface PluginPermissionStore {
    readonly pendingChanged: QtSignal;
    readonly records: ResourcePermission[];
    readonly changed: QtSignal;
    readonly confirmationRequested: QtSignal<
      [requestId: string, request: Omit<ResourcePermission, 'id'> & { purpose: string }]
    >;
    readonly revoked: QtSignal<[installationId: string, capability: ResourceCapability]>;
    revoke(id: string): boolean;
    decide(requestId: string, allow: boolean): void;
  }
  export interface EchoPluginPermissions {
    granted(capability: ResourceCapability): boolean;
    request(capability: ResourceCapability, purpose?: string): EchoPluginOperation<boolean>;
  }
  export interface ProcessLaunchOptions {
    /** Package-relative executable. Windows: .exe/.com; Unix: executable permission. */
    executable: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string | number | boolean | null>;
  }
  export interface PluginProcessInfo {
    readonly id: string;
    readonly pid: number;
    readonly executable: string;
    readonly cwd: string;
    readonly startedAt: number;
    readonly exitCode?: number;
    readonly crashed?: boolean;
  }
  export interface EchoPluginProcess {
    readonly running: PluginProcessInfo[];
    readonly changed: QtSignal;
    readonly exited: QtSignal<[process: PluginProcessInfo]>;
    readonly drained: QtSignal;
    launch(options: ProcessLaunchOptions): EchoPluginOperation<PluginProcessInfo>;
    /** Scope-owned opaque id, never an arbitrary system pid. Cancelling the wait does not undo termination. */
    terminate(id: string): EchoPluginOperation<boolean>;
  }
  export interface HostApiResponse {
    /** Host status: 0 success, 1 cancelled, 2 invalid input, 3 closed, 4 internal, 5 API failure. */
    status: number;
    body: JsonValue;
  }
  export interface HostApiRequest {
    readonly stage: 'api';
    readonly operation: string;
    readonly query: Record<string, JsonValue>;
    readonly headers: Record<string, string>;
  }
  export interface HostTransportRequest {
    readonly stage: 'transport';
    readonly operation: string;
    method: string;
    url: string;
    headers: Record<string, string[]>;
    bodyBase64: string;
  }
  export interface HostTransportResponse {
    readonly error?: Record<string, JsonValue>;
    /** Actual HTTP status; zero carries the original transport error. */
    status: number;
    headers: Record<string, string[]>;
    bodyBase64: string;
  }
  export interface HostApiPatch {
    query?: Record<string, JsonValue>;
  }
  export interface HostTransportPatch {
    method?: string;
    url?: string;
    headers?: Record<string, string[]>;
    bodyBase64?: string;
  }
  export interface EchoPluginInterceptRequest {
    readonly stage: 'api' | 'transport';
    readonly operation: string;
    readonly query: Record<string, JsonValue>;
    readonly transport: HostTransportRequest | Record<string, never>;
    /** api: frozen logical Authorization; transport: actual multi-value HTTP headers. */
    readonly headers: Record<string, string | string[]>;
    readonly active: boolean;
    readonly changed: QtSignal;
    /** First patch wins; every call observes the same downstream exchange. */
    next(
      patch?: HostApiPatch | HostTransportPatch,
    ): EchoPluginOperation<HostApiResponse | HostTransportResponse>;
  }
  export interface HostInterceptorDefinition {
    id: string;
    /** api patches unsigned operation queries; transport runs before wire conversion, with actual headers and bytes. */
    stage?: 'api' | 'transport';
    priority?: number;
    timeoutMs?: number;
    /** Operation prefix or synchronous predicate. Match failures pass through. */
    match?: string | RegExp | ((request: HostApiRequest | HostTransportRequest) => boolean);
    handle(
      request: EchoPluginInterceptRequest,
    ):
      | HostApiResponse
      | HostTransportResponse
      | void
      | Promise<HostApiResponse | HostTransportResponse | void>;
  }
  export interface EchoPluginServer {
    encodeBody(value: JsonValue, encoding?: 'json' | 'utf8'): string;
    decodeBody(base64: string, encoding?: 'json' | 'utf8'): JsonValue;
    intercept(definition: HostInterceptorDefinition): EchoPluginOperation<EchoPluginRegistration>;
  }
  export interface PluginWindowDefinition {
    id: string;
    component: string;
    title?: string;
    defaultWidth?: number;
    defaultHeight?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    position?: 'center' | 'top-center';
    transparent?: boolean;
    alwaysOnTop?: boolean;
    skipTaskbar?: boolean;
    resizable?: boolean;
    movable?: boolean;
    rememberBounds?: boolean;
    allowOutsideWorkArea?: boolean;
    acceptFirstMouse?: boolean;
  }
  export interface PluginWindowShowOptions {
    alwaysOnTop?: boolean;
    allowOutsideWorkArea?: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    focus?: boolean;
  }
  export type WindowResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
  export interface EchoPluginWindow {
    readonly id: string;
    readonly snapshot: {
      id: string;
      visible: boolean;
      loading: boolean;
      bounds: QtRect;
      ignoreMouseEvents: boolean;
      alwaysOnTop: boolean;
      positionSupported: boolean;
      error: string;
    };
    readonly changed: QtSignal;
    hide(): void;
    close(): void;
    setBounds(bounds: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }): EchoPluginOperation;
    setIgnoreMouseEvents(ignore: boolean): EchoPluginOperation;
    showOnTop(focus?: boolean): EchoPluginOperation;
    startMove(): EchoPluginOperation;
    startResize(direction: WindowResizeDirection): EchoPluginOperation;
    beginMove(globalX: number, globalY: number): EchoPluginOperation;
    beginResize(
      direction: WindowResizeDirection | '',
      globalX: number,
      globalY: number,
    ): EchoPluginOperation;
    updatePointer(globalX: number, globalY: number): void;
    endPointer(): void;
  }
  export interface EchoPluginWindows {
    list(): PluginWindowDefinition[];
    get(id: string): EchoPluginWindow | null;
    show(id: string, options?: PluginWindowShowOptions): EchoPluginOperation<EchoPluginWindow>;
    readonly snapshot: FloatingWindowsSnapshot;
    readonly changed: QtSignal;
    command(
      target: 'mini' | 'desktop',
      action:
        'show' | 'hide' | 'toggle' | 'showMain' | 'panel' | 'lock' | 'settings' | 'bounds' | 'move',
      arguments?: Record<string, JsonValue>,
    ): EchoPluginOperation;
  }
  export interface EchoPluginReadModel {
    readonly __qtListModel: unique symbol;
    row(index: number): Record<string, JsonValue>;
  }
  export type AudioSourceStage =
    'before-catalog' | 'catalog' | 'after-catalog' | 'cloud' | 'final-fallback';
  export type AudioSourcePosition = 'before-catalog' | 'after-catalog' | 'final-fallback';
  export interface QueueTrack {
    readonly id: string;
    readonly hash?: string;
    readonly title?: string;
    readonly artist?: string;
    readonly album?: string;
    readonly cover?: string;
    readonly albumId?: string;
    readonly songId?: string;
    readonly durationMs?: number;
    /** Stable resolver resource ID for a custom track without a catalog hash. */
    readonly sourceId?: string;
    readonly data?: Record<string, JsonValue>;
  }
  export interface EchoPluginSourceRequest {
    readonly canceled: boolean;
    readonly canceledChanged: QtSignal;
    track<T>(operation: EchoPluginOperation<T>): boolean;
  }
  export interface AudioSourceContext {
    readonly request: EchoPluginSourceRequest;
    readonly track: QueueTrack;
    readonly quality: string;
    readonly effect: string;
    readonly forceReload: boolean;
    readonly preloading: boolean;
  }
  export interface AudioStream {
    readonly url: string;
    /** FFmpeg audio ordinal, 0 selects its default stream. */
    readonly audioTrackId?: number;
  }
  export interface AudioSourceValue {
    readonly url?: string;
    readonly urls?: string[];
    readonly sources?: AudioStream[];
    readonly quality?:
      'standard' | 'higher' | 'flac' | 'hi_res' | 'viper_tape' | 'viper_clear' | 'viper_atmos';
    readonly effect?:
      | 'none'
      | 'piano'
      | 'vocal'
      | 'accompaniment'
      | 'subwoofer'
      | 'ancient'
      | 'surnay'
      | 'dj'
      | 'viper_atmos'
      | 'viper_clear';
    readonly durationMs?: number;
    readonly sourceKind?: 'plugin' | 'catalog' | 'cloud' | 'local' | 'mv';
    readonly noticeCode?: string;
    readonly loudness?: {
      readonly lufs?: number | null;
      readonly gain?: number | null;
      readonly peak?: number | null;
    } | null;
  }
  export type AudioSourceResult = string | AudioSourceValue | null | undefined | false;
  export interface AudioSourceDefinition {
    order?: number;
    position?: AudioSourcePosition;
    match?: (context: AudioSourceContext) => boolean | Promise<boolean>;
    resolve?: (
      context: AudioSourceContext & { readonly position: AudioSourcePosition },
    ) => AudioSourceResult | Promise<AudioSourceResult>;
    transformStages?: AudioSourceStage[];
    transform?: (
      context: AudioSourceContext & {
        readonly stage: AudioSourceStage;
        readonly source: Readonly<AudioSourceValue>;
      },
    ) => AudioSourceResult | Promise<AudioSourceResult>;
  }
  export interface EchoPluginAudioSource {
    registerResolver(id: string, definition: AudioSourceDefinition): EchoPluginRegistration | null;
  }
  export interface QueueSnapshot {
    readonly key: string;
    readonly title: string;
    readonly count: number;
    readonly currentIndex: number;
    readonly revision: string;
    readonly active: boolean;
  }
  export interface LyricDocumentContent {
    readonly content: string;
    readonly source?: string;
    /** Companion LRC, matched to original line timestamps before offsets. */
    readonly translation?: string;
    readonly romanization?: string;
  }
  export type LyricDocument = LyricDocumentContent &
    (
      | { readonly format: 'lrc' | 'yrc'; readonly encoding?: 'text' }
      | { readonly format: 'krc'; readonly encoding?: 'text' | 'base64' }
    );
  export interface LyricResolverContext {
    readonly request: EchoPluginSourceRequest;
    readonly track: QueueTrack;
    readonly hash: string;
    readonly durationMs: number;
    readonly force: boolean;
    readonly preserveCurrent: boolean;
  }
  export interface LyricResolverDefinition {
    order?: number;
    match?: (context: LyricResolverContext) => boolean | Promise<boolean>;
    resolve: (
      context: LyricResolverContext,
    ) =>
      LyricDocument | null | undefined | false | Promise<LyricDocument | null | undefined | false>;
  }
  export interface LyricSourceSnapshot extends LyricsSnapshot {
    readonly sourceId: string;
    readonly source: string;
    readonly manual: boolean;
    readonly loading: boolean;
    readonly errorMessage: string;
  }
  export type LyricCommand =
    | 'translation'
    | 'romanization'
    | 'conversion'
    | 'offset'
    | 'resetOffset'
    | 'globalOffset'
    | 'offsetStep'
    | 'copyLyrics'
    | 'seek';
  export interface EchoPluginLyrics {
    readonly snapshot: LyricSourceSnapshot;
    readonly model: EchoPluginReadModel;
    readonly changed: QtSignal;
    registerResolver(
      id: string,
      definition: LyricResolverDefinition,
    ): EchoPluginRegistration | null;
    onSnapshot(
      id: string,
      callback: (snapshot: LyricSourceSnapshot) => void,
      immediate?: boolean,
    ): EchoPluginRegistration | null;
    /** Scoped overlay; revision comes from snapshot.revision. Manual sources win. */
    write(revision: string, document: LyricDocument): EchoPluginOperation;
    /** Remove only this scope's write and restore the next layer or base source. */
    clear(revision: string): EchoPluginOperation;
    reload(revision: string, preserveCurrent?: boolean): EchoPluginOperation;
    command(action: LyricCommand, arguments?: PresentationArguments): EchoPluginOperation;
  }
  export interface EchoPluginPlaylist {
    readonly snapshot: QueueSnapshot[];
    readonly changed: QtSignal;
    tracks(key: string, offset?: number, limit?: number): QueueTrack[];
    /** Replace the plugin's queue; -1 retains it without starting playback. */
    replace(
      id: string,
      title: string,
      tracks: QueueTrack[],
      startIndex?: number,
    ): EchoPluginOperation;
    play(key: string, index: number): EchoPluginOperation;
    append(
      key: string,
      tracks: QueueTrack[],
      placement?: 'last' | 'next' | 'after',
    ): EchoPluginOperation;
    remove(key: string, revision: string, index: number): EchoPluginOperation;
    move(key: string, revision: string, from: number, to: number): EchoPluginOperation;
    clear(key: string, revision: string): EchoPluginOperation;
  }
  export interface EchoPluginPlayer {
    readonly audioSource: EchoPluginAudioSource;
    readonly snapshot: PlaybackSnapshot;
    readonly lyricsInfo: LyricsInfo;
    readonly revision: string;
    readonly lyricChanged: QtSignal;
    readonly eventOccurred: QtSignal<[event: string, payload: PlaybackSnapshot]>;
    lyricSnapshot(): LyricsSnapshot;
    control(action: PresentationCommand, arguments?: PresentationArguments): EchoPluginOperation;
    on(
      id: string,
      event: PlaybackEvent,
      callback: (snapshot: PlaybackSnapshot) => void,
      immediate?: boolean,
    ): EchoPluginRegistration | null;
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
  export type TaskStatus = 'pending' | 'running' | 'completed' | 'error' | 'aborted';
  export interface TaskAction {
    id: string;
    label: string;
    variant?: 'ghost' | 'primary' | 'danger';
    disabled?: boolean;
    closePanel?: boolean;
    onClick: () => void | Promise<void>;
  }
  export interface TaskItem {
    id: string;
    name: string;
    description?: string;
    error?: string;
    statusLabel?: string;
    actions?: TaskAction[];
  }
  export interface TaskPatch {
    icon?: string;
    priority?: number;
    name?: string;
    progress?: { done?: number; total?: number; percent?: number; label?: string };
    error?: string;
    actions?: TaskAction[];
    items?: TaskItem[];
  }
  export type TaskRetention = { mode: 'manual' } | { mode: 'auto'; delayMs: number };
  export interface TaskDefinition extends TaskPatch {
    name: string;
    status?: TaskStatus;
    priority?: number;
    retention?:
      | 'transient'
      | 'action-required'
      | { completed: TaskRetention; error: TaskRetention; aborted: TaskRetention };
  }
  export interface EchoPluginTasks {
    registerTask(id: string, definition: TaskDefinition): EchoPluginTask | null;
  }
  export interface EchoPluginTask {
    readonly active: boolean;
    readonly canceled: boolean;
    readonly status: TaskStatus;
    readonly activeChanged: QtSignal;
    readonly changed: QtSignal;
    readonly canceledChanged: QtSignal;
    readonly cancelRequested: QtSignal;
    cancel(): boolean;
    start(patch?: TaskPatch): boolean;
    update(patch: TaskPatch): boolean;
    finish(status: 'completed' | 'error' | 'aborted', patch?: TaskPatch): boolean;
    dismiss(): boolean;
    setProgress(percent: number, label?: string): boolean;
    complete(): boolean;
    fail(message: string): boolean;
    abort(): boolean;
    dispose(): void;
  }
  export interface SidebarDefinition {
    title: string;
    icon?: string;
    pageId?: string;
    section?: string;
    sectionTitle?: string;
    sectionOrder?: number;
    collapsible?: boolean;
    order?: number;
    before?: string;
    after?: string;
    visible?: boolean | (() => boolean);
    disabled?: boolean | (() => boolean);
    onClick?: () => void | Promise<void>;
  }
  export interface SongMenuContext {
    readonly track: PluginTrack;
    readonly selectedTracks: PluginTrack[];
    readonly selectionCount: number;
    readonly truncated: boolean;
    readonly sourceId: string;
    readonly revision?: number;
  }
  export interface SongMenuDefinition {
    label: string;
    order?: number;
    danger?: boolean;
    visible?: boolean | ((context: SongMenuContext) => boolean);
    enabled?: boolean | ((context: SongMenuContext) => boolean);
    onSelect: (context: SongMenuContext) => void | Promise<void>;
  }
  export interface EchoPluginShortcut {
    readonly active: boolean;
    readonly registered: boolean;
    readonly errorMessage: string;
    readonly changed: QtSignal;
    dispose(): void;
  }
  export interface EchoPluginShortcuts {
    registerShortcut(
      id: string,
      sequence: string,
      callback: () => void | Promise<void>,
      global?: boolean,
    ): EchoPluginShortcut | null;
  }
  export interface ToastOptions {
    title?: string;
    durationMs?: number;
    presentation?: 'auto' | 'mini' | 'standard';
  }
  export interface EchoPluginToast {
    info(message: string, options?: ToastOptions): EchoPluginOperation<{ id: string }>;
    success(message: string, options?: ToastOptions): EchoPluginOperation<{ id: string }>;
    warning(message: string, options?: ToastOptions): EchoPluginOperation<{ id: string }>;
    danger(message: string, options?: ToastOptions): EchoPluginOperation<{ id: string }>;
    dismiss(id: string): void;
  }
  export interface ScrollSnapshot {
    readonly position: number;
    readonly minimum: number;
    readonly maximum: number;
    readonly viewportHeight: number;
    readonly contentHeight: number;
    readonly moving: boolean;
    readonly atTop: boolean;
    readonly atBottom: boolean;
  }
  export interface EchoPluginScroll {
    current(): EchoUiPartRef | null;
    query(selector?: UiPartSelector): EchoUiPartRef | null;
    queryAll(selector?: UiPartSelector): EchoUiPartRef[];
    observe(
      id: string,
      selector: UiPartSelector,
      callback: (event: UiPartEvent) => void,
      immediate?: boolean,
    ): EchoPluginRegistration | null;
    snapshot(container: EchoUiPartRef): ScrollSnapshot | null;
    scrollTo(container: EchoUiPartRef, position: number): EchoPluginOperation;
    scrollBy(container: EchoUiPartRef, distance: number): EchoPluginOperation;
    top(container: EchoUiPartRef): EchoPluginOperation;
    bottom(container: EchoUiPartRef): EchoPluginOperation;
  }
  export interface LyricWord {
    readonly text: string;
    readonly start_ms: number;
    readonly duration_ms: number;
  }
  export interface LyricGlyph {
    readonly text: string;
    readonly utf16Start: number;
    readonly utf16Length: number;
    readonly rect: QtRect;
    readonly inkRect: QtRect;
    readonly rtl: boolean;
    readonly wordIndices: number[];
    readonly wordIndex: number;
    readonly startMs: number;
    readonly durationMs: number;
  }
  export interface LyricViewportSnapshot {
    readonly role: 'lyrics.viewport';
    readonly scope: 'page' | 'desktop';
    readonly timelineMs: number;
    readonly positionMs: number;
    readonly durationMs: number;
    readonly playbackRate: number;
    readonly playing: boolean;
    readonly appearance: { font: QtFont; playedColor: QtColor; unplayedColor: QtColor };
    readonly scrollIndex: number;
    readonly lyricsMode?: 'none' | 'translation' | 'romanization' | 'both';
    readonly currentIndex: number;
    readonly lineCount: number;
    readonly following: boolean;
    readonly browsing: boolean;
    readonly reducedMotion: boolean;
    readonly offsetMs: number;
    readonly line?: LyricLineSnapshot;
    readonly nextLine?: LyricLineSnapshot;
    readonly vertical?: boolean;
  }
  export interface LyricEffectLineSnapshot {
    readonly role: 'lyrics.line';
    readonly scope: 'page' | 'desktop';
    readonly text: string;
    readonly words: LyricWord[];
    readonly glyphs: LyricGlyph[];
    readonly timelineMs: number;
    readonly startMs: number;
    readonly durationMs: number;
    readonly current: boolean;
    readonly reducedMotion: boolean;
    readonly index?: number;
    readonly rubyUnits?: JsonValue[];
    readonly verticalUnits?: JsonValue[];
  }
  export interface LyricRunSnapshot {
    readonly role: 'lyrics.run';
    readonly text: string;
    readonly words: LyricWord[];
    readonly glyphs: LyricGlyph[];
    readonly timelineMs: number;
    readonly startMs: number;
    readonly durationMs: number;
    readonly current: boolean;
    readonly font: QtFont;
    readonly playedColor: QtColor;
    readonly unplayedColor: QtColor;
  }
  export interface LyricScrollRequest {
    readonly scope: 'page' | 'desktop';
    readonly index: number;
    readonly position: number;
    readonly previous?: number;
    readonly maximum?: number;
    readonly smooth: boolean;
    readonly browsing: boolean;
    readonly reducedMotion: boolean;
  }
  export interface LyricEffectDefinition {
    scopes?: ('page' | 'desktop')[];
    order?: number;
    style?: UiStyleProperties;
    component?: string;
    autoScroll?: (context: {
      host: EchoUiPartRef;
      request: LyricScrollRequest;
      snapshot: Omit<LyricViewportSnapshot, 'role'>;
    }) => boolean;
  }
  export interface EchoPluginLyricEffects {
    registerEffect(id: string, definition: LyricEffectDefinition): EchoPluginRegistration | null;
    snapshot(
      part: EchoUiPartRef,
    ): LyricViewportSnapshot | LyricEffectLineSnapshot | LyricRunSnapshot | null;
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
  /** Numeric arrays use dataFormat; ArrayBuffer contains already packed bytes. */
  export type GpuData = readonly number[] | ArrayBuffer | ArrayBufferView;
  export type GpuDataFormat = 'float32' | 'float16' | 'uint8' | 'uint16' | 'uint32';
  export interface GpuBufferDefinition { size: number; usage: readonly ('uniform'|'vertex'|'index'|'storage')[]; format?: GpuDataFormat; }
  export interface GpuTextureDefinition { width: number; height: number; format?: 'rgba8'|'rgba16f'|'rgba32f'|'r32f'; usage: readonly ('sampled'|'storage'|'render-target'|'readback')[]; }
  export interface GpuSamplerDefinition { minFilter?: 'linear'|'nearest'; magFilter?: 'linear'|'nearest'; u?: 'clamp'|'repeat'|'mirror'; v?: 'clamp'|'repeat'|'mirror'; }
  export interface GpuRenderPipelineDefinition { vertexShader: string; fragmentShader: string; topology?: 'triangles'|'triangle-strip'|'lines'|'line-strip'|'points'; blend?: 'none'|'alpha'|'add'; cull?: 'none'|'back'|'front'; depthTest?: boolean;depthWrite?:boolean; vertexLayout?: {stride:number;attributes:readonly {location:number;offset:number;format:'float'|'float2'|'float3'|'float4'}[]}; }
  export interface GpuComputePipelineDefinition { computeShader: string; }
  export interface GpuBinding { kind: 'uniform'|'texture'|'storage-buffer'|'storage-image'; binding: number; resource: string; sampler?: string; access?: 'read'|'write'|'read-write'; }
  export interface GpuDraw { count:number; first?:number; instances?:number; vertexBuffer?:string; vertexOffset?:number; indexBuffer?:string; indexFormat?:'uint16'|'uint32'; }
  export interface GpuRenderPass { type:'render'; pipeline:string; target?:string;loadOp?:'clear'|'load'; clear?:readonly [number,number,number,number]; bindings:readonly GpuBinding[]; draws:readonly GpuDraw[]; }
  export interface GpuComputePass { type:'compute'; pipeline:string; bindings:readonly GpuBinding[]; groups:readonly [number,number,number]; }
  export interface GpuFrame { passes:readonly (GpuRenderPass|GpuComputePass)[]; }
  export interface GpuCapabilities { readonly available:boolean;readonly limits?:Readonly<Record<string,number>>;readonly nativeBudgetUsed?:number;readonly targetBudgetUsed?:number;readonly state?:'ready'|'error'|'suspended'|'unavailable'|'waiting';readonly reason?:string;readonly backend?:string;readonly compute:boolean;readonly hdr:boolean;readonly floatTextures?:boolean;readonly hdrSwapChain?:boolean;readonly headroom?:number;readonly sdrWhiteLevel?:number;readonly generation?:number;readonly frames?:number;readonly nativeResources?:number;readonly pipelineBuilds?:number;readonly logicalResources?:number;readonly logicalBytes?:number; }
  export interface GpuReadback { data:ArrayBuffer;width?:number;height?:number;format?:string; }
  export interface EchoGpuResource { readonly id:string; readonly kind:string; readonly active:boolean; readonly changed:QtSignal;dispose():void; }
  /** Handles are scoped to this presentation, account and activation. */
  export interface EchoPluginGraphics {
    readonly capabilities:GpuCapabilities;readonly errorMessage:string;
    readonly changed:QtSignal;readonly resourcesChanged:QtSignal;readonly drainedChanged:QtSignal;
    createBuffer(definition:GpuBufferDefinition,data?:GpuData):EchoGpuResource|null;
    createTexture(definition:GpuTextureDefinition,data?:GpuData):EchoGpuResource|null;
    createSampler(definition?:GpuSamplerDefinition):EchoGpuResource|null;
    createRenderPipeline(definition:GpuRenderPipelineDefinition):EchoGpuResource|null;
    createComputePipeline(definition:GpuComputePipelineDefinition):EchoGpuResource|null;
    writeBuffer(resource:EchoGpuResource,data:GpuData,offset?:number):boolean;
    writeTexture(resource:EchoGpuResource,data:GpuData):boolean;
  }
  /** QML item from EchoMusic.PluginSdk. Output is linear, premultiplied RGBA. */
  export interface EchoGpuSurface {
    graphics:EchoPluginGraphics|null;paused:boolean;continuous:boolean;fps:number;dynamicRange:'auto'|'sdr'|'hdr';
    readonly status:GpuCapabilities;readonly graphicsChanged:QtSignal;readonly configurationChanged:QtSignal;readonly statusChanged:QtSignal;
    submit(frame:GpuFrame):boolean;requestFrame():void;readback(resource?:EchoGpuResource|null):EchoPluginOperation<GpuReadback>|null;
  }
  export interface EchoPluginAudio {
    readonly spectrum: EchoPluginSpectrum;
  }
  export interface UiPartSelector {
    /** Instance ID. Recycled delegates always receive a new ID. */
    id?: string;
    /** Exact role, '*' or a namespace such as 'control.*'. */
    role?: string;
    key?: string;
    surface?: string;
    /** Engine-local window identity, not a native window handle. */
    window?: string;
  }
  export interface UiStyleProperties {
    foreground?: string | QtColor;
    secondaryForeground?: string | QtColor;
    background?: string | QtColor;
    borderColor?: string | QtColor;
    accent?: string | QtColor;
    radius?: number;
    borderWidth?: number;
    opacity?: number;
    font?: QtFont;
    fontSize?: number;
    fontWeight?: number;
    letterSpacing?: number;
    scale?: number;
    translateX?: number;
    translateY?: number;
  }
  export interface QtRect {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }
  export type UiPartPosition =
    'append' | 'prepend' | 'before' | 'after' | 'replace' | 'background' | 'foreground';
  export interface EchoUiPartRef {
    readonly id: string;
    readonly revision: string;
    readonly role: string;
    readonly key: string;
    readonly surface: string;
    readonly window: string;
    readonly valid: boolean;
    readonly visible: boolean;
    /** Current window-scene coordinates. Not device pixels. */
    readonly geometry: QtRect;
    readonly state: Readonly<Record<string, unknown>>;
    readonly visuals: Readonly<UiStyleProperties>;
    readonly properties: readonly string[];
    readonly actions: readonly string[];
    readonly replaceable: boolean;
    readonly changed: QtSignal;
    readonly invalidated: QtSignal;
    readonly eventOccurred: QtSignal<[event: string, payload: Record<string, JsonValue>]>;
    invoke(action: string, arguments?: Record<string, JsonValue>): EchoPluginOperation;
  }
  export interface UiPartEvent {
    readonly type: 'added' | 'changed' | 'removed' | 'event';
    readonly part: EchoUiPartRef;
    readonly event: string;
    readonly payload: Record<string, JsonValue>;
  }
  export interface EchoUiPartMount {
    readonly active: boolean;
    readonly loaded: boolean;
    readonly errorMessage: string;
    readonly position: UiPartPosition;
    readonly changed: QtSignal;
    dispose(): void;
  }
  export interface EchoPluginUiParts {
    readonly errorMessage: string;
    readonly errorChanged: QtSignal;
    query(selector?: UiPartSelector): EchoUiPartRef | null;
    queryAll(selector?: UiPartSelector): EchoUiPartRef[];
    observe(
      id: string,
      selector: UiPartSelector,
      callback: (event: UiPartEvent) => void,
      immediate?: boolean,
    ): EchoPluginRegistration | null;
    mount(
      id: string,
      part: EchoUiPartRef,
      position: UiPartPosition,
      packageRelativeQml: string,
      priority?: number,
    ): EchoUiPartMount | null;
  }
  export interface EchoUiStyleRule {
    readonly key: string;
    readonly revision: string;
    readonly active: boolean;
    readonly priority: number;
    readonly values: Readonly<UiStyleProperties>;
    readonly changed: QtSignal;
    /** Replace this rule's complete visual map; omitted fields stop contributing. */
    update(values: UiStyleProperties): boolean;
    setPriority(priority: number): boolean;
    dispose(): void;
  }
  export interface EchoPluginUiStyles {
    readonly errorMessage: string;
    readonly errorChanged: QtSignal;
    registerRule(
      id: string,
      selector: UiPartSelector,
      values: UiStyleProperties,
      priority?: number,
    ): EchoUiStyleRule | null;
  }
  export type HostRoute =
    | 'home'
    | 'recommend-songs'
    | 'ranking'
    | 'free-listen'
    | 'discover-flow'
    | 'personal-fm'
    | 'explore'
    | 'recognize'
    | 'search'
    | 'song-detail'
    | 'mv-detail'
    | 'artist-detail'
    | 'album-detail'
    | 'playlist-detail'
    | 'favorites'
    | 'history'
    | 'cloud'
    | 'purchased'
    | 'profile'
    | 'listen-together'
    | 'themes'
    | 'plugin-management'
    | 'settings';
  export interface HostNavigationTarget {
    name: HostRoute;
    resourceId?: string;
    query?: Record<string, string>;
    replace?: boolean;
  }
  export interface HostNavigationState {
    readonly name: string;
    readonly resourceId: string;
    readonly query: Record<string, string>;
    readonly canGoBack: boolean;
    readonly canGoForward: boolean;
  }
  export interface EchoPluginNavigation {
    available(): string[];
    read(): EchoPluginOperation<HostNavigationState>;
    navigate(target: HostNavigationTarget): EchoPluginOperation<HostNavigationState>;
    history(command: 'back' | 'forward' | 'refresh'): EchoPluginOperation<HostNavigationState>;
    observe(
      id: string,
      callback: (state: HostNavigationState) => void,
    ): EchoPluginOperation<EchoPluginRegistration>;
  }
  export interface HostPlaybackSettings {
    mvAudioFallbackEnabled: boolean;
    queueMode: 'single' | 'context';
    defaultQuality:
      'standard' | 'higher' | 'flac' | 'hi_res' | 'viper_tape' | 'viper_clear' | 'viper_atmos';
    autoPlayOnLaunch: boolean;
    compatibilityMode: boolean;
    volumeFade: boolean;
    volumeFadeMs: number;
    viperQualityEnabled: boolean;
    autoNext: boolean;
    preventSleep: boolean;
    autoNextDelaySeconds: number;
    autoNextMaxAttempts: number;
  }
  export interface HostShellSettings {
    keepAliveEnabled: boolean;
    keepAliveMax: number;
    motionEnabled: boolean;
    searchDefaultEnabled: boolean;
    lyricBarrageEnabled: boolean;
    mvBarrageEnabled: boolean;
    showFullscreenButton: boolean;
  }
  export interface HostAppearanceSettings {
    mode: 0 | 1 | 2 | 3;
    coverAtmosphere: boolean;
    atmosphereHeight: number;
    atmosphereStrength: number;
    transparency: number;
    windowFrosted: boolean;
    floatingFrosted: boolean;
    panelOpacity: number;
    globalFont: string;
    lyricFont: string;
    desktopLyricFont: string;
    miniLyricFont: string;
    taskbarLyricFont: string;
  }
  export interface HostLyricSettings {
    alignPosition: number;
    enableSpring: boolean;
    highRefreshRate: boolean;
    enableBlur: boolean;
    enableScale: boolean;
    hidePassedLines: boolean;
    wordFadeWidth: number;
    dynamicAlbumCover: boolean;
    textColor: string;
    useCoverColor: boolean;
    fontScale: number;
    fontWeight: number;
    backgroundBlur: boolean;
    backgroundRhythm: boolean;
    playedColor: string;
    unplayedColor: string;
    followCoverColor: boolean;
    unplayedFollowCoverColor: boolean;
    unplayedTextColor: string;
    unplayedUseCoverColor: boolean;
  }
  export interface HostMiniSettings {
    alwaysOnTop: boolean;
    layout: 'horizontal' | 'vertical';
    alignment: 'left' | 'center' | 'right';
    shadowStrength: 'none' | 'soft' | 'normal' | 'strong';
    bold: boolean;
    showNextLinePreview: boolean;
    playedColor: string;
    unplayedColor: string;
    followCoverColor: boolean;
    unplayedFollowCoverColor: boolean;
    fontSize: number;
    secondaryFontSize: number;
    lineGap: number;
    fontWeight: 400 | 600 | 780;
    backgroundBlur: boolean;
  }
  export interface HostDesktopSettings {
    alwaysOnTop: boolean;
    showUnlockButton: boolean;
    layout: 'horizontal' | 'vertical';
    alignment: 'left' | 'center' | 'right' | 'both';
    shadowStrength: 'none' | 'soft' | 'normal' | 'strong';
    bold: boolean;
    showNextLinePreview: boolean;
    playedColor: string;
    unplayedColor: string;
    followCoverColor: boolean;
    unplayedFollowCoverColor: boolean;
    fontSize: number;
    secondaryFontSize: number;
    lineGap: number;
    fontWeight: 400 | 600 | 780;
    backgroundBlur: boolean;
  }
  export interface HostSettingDescriptor {
    readonly key: string;
    readonly type: 'boolean' | 'string' | 'number';
    readonly writable: boolean;
    readonly integer?: boolean;
    readonly minimum?: number;
    readonly maximum?: number;
    readonly choices?: string[] | number[];
  }
  export interface EchoPluginSettings {
    readonly sourceChanged: QtSignal;
    catalog(): { domain: string; properties: HostSettingDescriptor[] }[];
    read(domain: 'playback'): EchoPluginOperation<Readonly<HostPlaybackSettings>>;
    read(domain: 'shell'): EchoPluginOperation<Readonly<HostShellSettings>>;
    read(domain: 'appearance'): EchoPluginOperation<Readonly<HostAppearanceSettings>>;
    read(domain: 'lyrics'): EchoPluginOperation<Readonly<HostLyricSettings>>;
    read(domain: 'mini'): EchoPluginOperation<Readonly<HostMiniSettings>>;
    read(domain: 'desktop'): EchoPluginOperation<Readonly<HostDesktopSettings>>;
    update(
      domain: 'playback',
      patch: Partial<HostPlaybackSettings>,
    ): EchoPluginOperation<Readonly<HostPlaybackSettings>>;
    update(
      domain: 'shell',
      patch: Partial<HostShellSettings>,
    ): EchoPluginOperation<Readonly<HostShellSettings>>;
    update(
      domain: 'appearance',
      patch: Partial<HostAppearanceSettings>,
    ): EchoPluginOperation<Readonly<HostAppearanceSettings>>;
    update(
      domain: 'lyrics',
      patch: Partial<HostLyricSettings>,
    ): EchoPluginOperation<Readonly<HostLyricSettings>>;
    update(
      domain: 'mini',
      patch: Partial<HostMiniSettings>,
    ): EchoPluginOperation<Readonly<HostMiniSettings>>;
    update(
      domain: 'desktop',
      patch: Partial<HostDesktopSettings>,
    ): EchoPluginOperation<Readonly<HostDesktopSettings>>;
    observe(
      id: string,
      domain: 'playback',
      callback: (values: Readonly<HostPlaybackSettings>) => void,
    ): EchoPluginOperation<EchoPluginRegistration>;
    observe(
      id: string,
      domain: 'shell',
      callback: (values: Readonly<HostShellSettings>) => void,
    ): EchoPluginOperation<EchoPluginRegistration>;
    observe(
      id: string,
      domain: 'appearance',
      callback: (values: Readonly<HostAppearanceSettings>) => void,
    ): EchoPluginOperation<EchoPluginRegistration>;
    observe(
      id: string,
      domain: 'lyrics',
      callback: (values: Readonly<HostLyricSettings>) => void,
    ): EchoPluginOperation<EchoPluginRegistration>;
    observe(
      id: string,
      domain: 'mini',
      callback: (values: Readonly<HostMiniSettings>) => void,
    ): EchoPluginOperation<EchoPluginRegistration>;
    observe(
      id: string,
      domain: 'desktop',
      callback: (values: Readonly<HostDesktopSettings>) => void,
    ): EchoPluginOperation<EchoPluginRegistration>;
  }
  export interface CoverFallbackContext {
    readonly url: string;
    readonly normalizedUrl: string;
    readonly failedUrl?: string;
    readonly reason: 'empty' | 'error';
    readonly scope: string;
    readonly alt: string;
    readonly size: number;
    readonly accentColor: string;
    readonly accentColorRgb: [number, number, number];
  }
  export interface EchoPluginCover {
    createThemedIconCoverUrl(options: {
      icon?: string | { body: string; width?: number; height?: number };
      color?: string;
    }): string;
    createThemedIconCoverUrl(icon?: string, color?: string): string;
    setFallback(
      id: string,
      resolver: (context: CoverFallbackContext) => string | null | undefined,
      priority?: number,
    ): EchoPluginOperation<EchoPluginRegistration>;
    invalidate(): void;
  }
  export interface HostActionDefinition {
    title: string;
    icon: string;
    tooltip?: string;
    defaultPlacement?: 'toolbar' | 'left' | 'center' | 'right' | 'more';
    order?: number;
    visible?: boolean | (() => boolean);
    disabled?: boolean | (() => boolean);
    active?: boolean | (() => boolean);
    badge?: string | number | null | (() => string | number | null | undefined);
    badgeTitle?: string;
    badgeDefaultVisible?: boolean;
    trigger?: 'click' | 'hover';
    onClick: () => void | Promise<void>;
  }
  export type HostTitlebarActionDefinition = Omit<HostActionDefinition, 'defaultPlacement'> & {
    defaultPlacement?: 'toolbar' | 'more';
  };
  export type HostPlayerbarActionDefinition = Omit<HostActionDefinition, 'defaultPlacement'> & {
    defaultPlacement?: 'left' | 'center' | 'right' | 'more';
  };
  export type HostActionPatch = Partial<
    Omit<HostActionDefinition, 'defaultPlacement' | 'order' | 'badgeDefaultVisible'>
  >;
  export interface EchoPluginAction {
    readonly key: string;
    readonly revision: string;
    readonly active: boolean;
    readonly busy: boolean;
    readonly state: {
      title: string;
      icon: string;
      tooltip: string;
      visible: boolean;
      disabled: boolean;
      active: boolean;
      badge: string;
      busy: boolean;
    };
    readonly changed: QtSignal;
    update(patch: HostActionPatch): boolean;
    refresh(): void;
    invoke(): EchoPluginOperation<JsonValue | void> | null;
    cancel(): void;
    dispose(): void;
  }
  export interface EchoPluginUi {
    registerSidebarItem(id: string, definition: SidebarDefinition): EchoPluginRegistration | null;
    registerShortcutCard(id: string, definition: SidebarDefinition): EchoPluginRegistration | null;
    registerSongMenuItem(id: string, definition: SongMenuDefinition): EchoPluginRegistration | null;
    readonly navigation: EchoPluginNavigation;
    readonly cover: EchoPluginCover;
    registerTitlebarActionDefinition(
      id: string,
      definition: HostTitlebarActionDefinition,
    ): EchoPluginAction | null;
    registerPlayerbarActionDefinition(
      id: string,
      definition: HostPlayerbarActionDefinition,
    ): EchoPluginAction | null;
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
  export interface FileReference {
    readonly grantId: string;
    readonly revision: string;
    /** Portable path relative to the selected directory; empty for its root or a selected file. */
    readonly path: string;
  }
  export type FileAccess = 'read' | 'read-write';
  export type FileConflict = 'fail' | 'rename' | 'replace';
  export type FileEncoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'latin1';
  export interface FileGrant {
    readonly id: string;
    readonly revision: string;
    readonly file: FileReference;
    readonly name: string;
    readonly kind: 'directory' | 'file' | 'data' | 'cache';
    readonly access: FileAccess;
    readonly persistent: boolean;
    readonly revoked: boolean;
    readonly available: boolean;
    /** Display only. This path is not accepted as file authority. */
    readonly displayPath: string;
    readonly installationId: string;
    readonly pluginId: string;
    readonly pluginName: string;
  }
  export interface FileOperationOptions {
    readonly revision?: string;
  }
  export interface FileSelectionOptions extends FileOperationOptions {
    purpose: string;
    access?: FileAccess;
    persist?: boolean;
    defaultPath?: string;
    multiple?: boolean;
    filters?: { name: string; extensions: string[] }[];
  }
  export interface DirectorySelection {
    readonly canceled: boolean;
    readonly directory?: FileGrant;
  }
  export interface FileSelection {
    readonly canceled: boolean;
    readonly files?: FileGrant[];
  }
  export interface FileStat {
    readonly file: FileReference;
    readonly name: string;
    readonly size: number;
    readonly modifiedAt: number;
    readonly directory: boolean;
    readonly mimeType: string;
  }
  export interface FileMetadata extends FileStat {
    readonly width?: number;
    readonly height?: number;
    readonly media?: {
      readonly title: string | null;
      readonly artist: string | null;
      readonly album: string | null;
      readonly durationMs: number | null;
    };
  }
  export interface FileListOptions extends FileOperationOptions {
    hidden?: boolean;
    depth?: number;
    limit?: number;
    kind?: 'all' | 'file' | 'directory' | 'image' | 'audio' | 'video';
  }
  export interface FileReadOptions extends FileOperationOptions {
    offset?: number;
    maxBytes?: number;
  }
  export interface FileTextReadOptions extends FileReadOptions {
    encoding?: FileEncoding;
  }
  export interface FileWriteOptions extends FileOperationOptions {
    conflict?: FileConflict;
  }
  export interface FileTextWriteOptions extends FileWriteOptions {
    encoding?: FileEncoding;
  }
  export interface MediaLeaseOptions extends FileOperationOptions {
    lifetime?: 'track' | 'scope';
  }
  export interface EchoPluginMediaLease {
    readonly id: string;
    readonly url: { toString(): string };
    readonly active: boolean;
    readonly changed: QtSignal;
    dispose(): void;
  }
  export interface EchoPluginFiles {
    readonly drained: QtSignal;
    requestDirectory(options: FileSelectionOptions): EchoPluginOperation<DirectorySelection>;
    requestFiles(options: FileSelectionOptions): EchoPluginOperation<FileSelection>;
    reauthorize(
      id: string,
      options: FileSelectionOptions,
    ): EchoPluginOperation<DirectorySelection | FileSelection>;
    listGrants(): EchoPluginOperation<FileGrant[]>;
    revoke(id: string): EchoPluginOperation;
    privateDirectory(kind?: 'data' | 'cache'): EchoPluginOperation<FileGrant>;
    stat(file: FileReference, options?: FileOperationOptions): EchoPluginOperation<FileStat>;
    mkdir(
      file: FileReference,
      options?: FileOperationOptions & { recursive?: boolean },
    ): EchoPluginOperation<FileStat>;
    listFiles(
      file: FileReference,
      options?: FileListOptions,
    ): EchoPluginOperation<{ entries: FileStat[]; truncated: boolean }>;
    readText(
      file: FileReference,
      options?: FileTextReadOptions,
    ): EchoPluginOperation<{ text: string; bytesRead: number; truncated: boolean }>;
    readBytes(
      file: FileReference,
      options?: FileReadOptions,
    ): EchoPluginOperation<{ bytes: ArrayBuffer; bytesRead: number; truncated: boolean }>;
    metadata(
      file: FileReference,
      options?: FileOperationOptions,
    ): EchoPluginOperation<FileMetadata>;
    writeText(
      file: FileReference,
      text: string,
      options?: FileTextWriteOptions,
    ): EchoPluginOperation<FileStat>;
    writeBytes(
      file: FileReference,
      bytes: ArrayBuffer,
      options?: FileWriteOptions,
    ): EchoPluginOperation<FileStat>;
    deleteFile(file: FileReference, options?: FileOperationOptions): EchoPluginOperation;
    copyFile(
      source: FileReference,
      target: FileReference,
      options?: FileWriteOptions,
    ): EchoPluginOperation<FileStat>;
    openMedia(
      file: FileReference,
      options?: MediaLeaseOptions,
    ): EchoPluginOperation<EchoPluginMediaLease>;
  }
  export interface DownloadOptions extends FileOperationOptions {
    url: string;
    target: FileReference;
    headers?: Record<string, string>;
    name?: string;
    sourceKey?: string;
    idempotencyKey?: string;
    conflict?: FileConflict;
    resume?: boolean;
    expectedBytes?: number;
    maxBytes?: number;
    checksum?: { algorithm: 'sha256'; value: string };
    connectTimeoutMs?: number;
    idleTimeoutMs?: number;
    lifetime?: 'scope' | 'track';
  }
  export interface DownloadSource {
    url?: string;
    headers?: Record<string, string>;
    target?: FileReference;
  }
  export interface DownloadResult {
    readonly taskId: string;
    readonly file: FileReference;
    readonly bytes: number;
    readonly sha256: string;
  }
  export interface DownloadSnapshot {
    readonly lifetime: 'track' | 'scope';
    readonly id: string;
    readonly runId: string;
    readonly revision: string;
    readonly state:
      | 'queued'
      | 'connecting'
      | 'downloading'
      | 'paused'
      | 'interrupted'
      | 'verifying'
      | 'committing'
      | 'completed'
      | 'failed'
      | 'canceled';
    readonly name: string;
    readonly sourceKey: string;
    readonly target: FileReference;
    readonly receivedBytes: number;
    readonly totalBytes: number | null;
    readonly bytesPerSecond: number;
    readonly remainingSeconds: number | null;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly canPause: boolean;
    readonly canResume: boolean;
    readonly canRetry: boolean;
    readonly errorCode: string;
    readonly errorMessage: string;
    readonly result: DownloadResult | null;
  }
  export interface EchoPluginDownload {
    readonly id: string;
    readonly active: boolean;
    readonly snapshot: DownloadSnapshot;
    readonly changed: QtSignal;
    pause(): EchoPluginOperation<DownloadSnapshot>;
    resume(source?: DownloadSource): EchoPluginOperation<DownloadSnapshot>;
    retry(source?: DownloadSource): EchoPluginOperation<DownloadSnapshot>;
    cancel(): EchoPluginOperation<DownloadSnapshot>;
    /** Canceling this wait does not cancel the transfer. */
    wait(): EchoPluginOperation<DownloadResult>;
  }
  export interface EchoPluginDownloads {
    start(options: DownloadOptions): EchoPluginOperation<EchoPluginDownload>;
    list(offset?: number, limit?: number): EchoPluginOperation<DownloadSnapshot[]>;
    get(id: string): EchoPluginOperation<DownloadSnapshot>;
    attach(id: string): EchoPluginOperation<EchoPluginDownload>;
    /** Removes terminal history/partial data, preserving the completed destination. */
    remove(id: string): EchoPluginOperation;
  }
  export interface NetworkRequestOptions extends FileOperationOptions {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string | JsonValue[] | { [key: string]: JsonValue } | ArrayBuffer;
    responseType?: 'json' | 'text' | 'arrayBuffer';
    timeoutMs?: number;
    maxResponseBytes?: number;
    maxRedirects?: number;
    decompress?: boolean;
    tls?: { rejectUnauthorized?: boolean; servername?: string };
  }
  export interface NetworkResponse {
    readonly status: number;
    readonly statusText: string;
    readonly headers: Record<string, string | string[]>;
    readonly data: JsonValue | ArrayBuffer | undefined;
    readonly url: string;
  }
  export interface TcpConnectOptions {
    host: string;
    port: number;
    connectTimeoutMs?: number;
    writeTimeoutMs?: number;
    noDelay?: boolean;
    keepAlive?: boolean;
    keepAliveInitialDelayMs?: number;
  }
  export interface EchoPluginTcp {
    readonly drained: QtSignal;
    connect(options: TcpConnectOptions): EchoPluginOperation<EchoPluginTcpConnection>;
  }
  export interface EchoPluginTcpConnection {
    readonly id: string;
    readonly closed: boolean;
    readonly changed: QtSignal;
    read(): EchoPluginOperation<ArrayBuffer | null>;
    write(data: ArrayBuffer): EchoPluginOperation;
    end(): EchoPluginOperation;
    close(): void;
  }
  export interface WebServerListenOptions {
    host?: '127.0.0.1' | 'localhost';
    port?: number;
    path?: string;
    allowCrossOrigin?: boolean;
    maxConnections?: number;
    maxMessageBytes?: number;
    maxBufferedBytes?: number;
  }
  export interface WebServerRequest {
    readonly requestId: string;
    readonly pluginId: string;
    readonly method: string;
    readonly url: string;
    readonly path: string;
    readonly query: Record<string, string | string[]>;
    readonly headers: Record<string, string | string[]>;
    readonly body: ArrayBuffer;
    readonly remoteAddress: string;
  }
  export interface WebServerResponse {
    status?: number;
    headers?: Record<string, string | string[]>;
    body?: JsonValue | ArrayBuffer;
  }
  export interface WebSocketUpgradeRequest extends Omit<WebServerRequest, 'body' | 'method'> {
    readonly connectionId: string;
    readonly protocols: string[];
  }
  export interface WebSocketUpgradeDecision {
    accept?: boolean;
    protocol?: string;
  }
  export interface EchoPluginWebSocket {
    readonly id: string;
    readonly request: Omit<WebSocketUpgradeRequest, 'protocols' | 'requestId'> & {
      readonly connectionId: string;
      readonly protocol: string;
    };
    readonly readyState: number;
    readonly changed: QtSignal;
    readonly message: QtSignal<[data: string | ArrayBuffer, binary: boolean]>;
    readonly closed: QtSignal<[code: number, reason: string]>;
    readonly error: QtSignal<[message: string]>;
    readonly pong: QtSignal<[elapsedMs: number, payload: ArrayBuffer]>;
    sendText(text: string): EchoPluginOperation;
    sendBytes(bytes: ArrayBuffer): EchoPluginOperation;
    ping(bytes?: ArrayBuffer): EchoPluginOperation;
    close(code?: number, reason?: string): void;
  }
  export interface EchoPluginWebServer {
    readonly status: {
      running: boolean;
      host?: string;
      port?: number;
      origin?: string;
      url?: string;
      startedAt?: number;
      connections: number;
      pendingRequests: number;
    };
    readonly changed: QtSignal;
    readonly drained: QtSignal;
    listen(options?: WebServerListenOptions): EchoPluginOperation<{
      host: string;
      port: number;
      origin: string;
      url: string;
      startedAt: number;
    }>;
    onRequest(
      id: string,
      callback: (
        request: WebServerRequest,
      ) =>
        | WebServerResponse
        | JsonValue
        | ArrayBuffer
        | void
        | Promise<WebServerResponse | JsonValue | ArrayBuffer | void>,
    ): EchoPluginRegistration | null;
    onUpgrade(
      id: string,
      callback: (
        request: WebSocketUpgradeRequest,
      ) =>
        | WebSocketUpgradeDecision
        | boolean
        | void
        | Promise<WebSocketUpgradeDecision | boolean | void>,
    ): EchoPluginRegistration | null;
    onConnection(
      id: string,
      callback: (socket: EchoPluginWebSocket) => void | (() => void),
    ): EchoPluginRegistration | null;
    close(): EchoPluginOperation;
  }
  export interface EchoPluginNetwork {
    readonly tcp: EchoPluginTcp;
    readonly drained: QtSignal;
    request(options: NetworkRequestOptions): EchoPluginOperation<NetworkResponse>;
  }
  /** Large SQLite integers use decimal text to preserve all 64 bits in JS. */
  export interface SqliteInt64 {
    readonly type: 'int64';
    readonly data: string;
  }
  export interface SqliteBlob {
    readonly type: 'hex' | 'base64';
    readonly data: string;
  }
  export type SqliteParam = string | number | boolean | null | SqliteInt64 | SqliteBlob;
  export type SqliteValue =
    string | number | null | SqliteInt64 | { readonly type: 'hex'; readonly data: string };
  export type SqliteRow = Readonly<Record<string, SqliteValue>>;
  export interface SqliteMigration {
    version: number;
    sql: string | string[];
  }
  export interface SqliteOpenOptions {
    name?: string;
    readOnly?: boolean;
    busyTimeoutMs?: number;
    migrations?: SqliteMigration[];
  }
  export interface SqliteQueryOptions {
    limit?: number;
  }
  export interface SqliteStatement {
    sql: string;
    params?: SqliteParam[];
  }
  export interface SqliteRunResult {
    readonly changes: number;
    readonly lastInsertRowid: SqliteValue;
  }
  export interface SqliteQueryResult {
    readonly rows: SqliteRow[];
    readonly rowCount: number;
    readonly truncated: boolean;
  }
  export interface SqliteDatabaseInfo {
    readonly name: string;
    readonly size: number;
    readonly modifiedAt: number;
  }
  export interface EchoPluginDatabase {
    readonly name: string;
    readonly version: number;
    readonly readOnly: boolean;
    readonly active: boolean;
    readonly activeChanged: QtSignal;
    /** Execute a schema/write script atomically, including complete triggers. */
    exec(sql: string): EchoPluginOperation;
    run(sql: string, params?: SqliteParam[]): EchoPluginOperation<SqliteRunResult>;
    get(sql: string, params?: SqliteParam[]): EchoPluginOperation<SqliteRow | null>;
    all(
      sql: string,
      params?: SqliteParam[],
      options?: SqliteQueryOptions,
    ): EchoPluginOperation<SqliteQueryResult>;
    /** Atomic, ordered writes. Any failure rolls back the entire batch. */
    transaction(statements: SqliteStatement[]): EchoPluginOperation<SqliteRunResult[]>;
    close(): EchoPluginOperation<boolean>;
  }
  export interface BackupScope {
    settings?: boolean;
    plugins?: boolean;
  }
  export interface BackupSummary {
    readonly createdAt: string;
    readonly appVersion: string;
    readonly settings: boolean;
    readonly plugins: boolean;
    readonly settingCount: number;
    readonly pluginCount: number;
    readonly pluginNames: string[];
  }
  export interface BackupArchive {
    readonly data: ArrayBuffer;
    readonly fileName: string;
    readonly summary: BackupSummary;
  }
  export interface BackupInspection {
    readonly token: string;
    readonly summary: BackupSummary;
  }
  export interface BackupRestoreResult {
    readonly restartScheduled: boolean;
    readonly settingsImported: boolean;
    readonly pluginsImported: number;
  }
  export interface BackupProviderEntry {
    id: string;
    name: string;
    createdAt?: string;
    size?: number;
    description?: string;
  }
  export interface BackupProviderDefinition {
    name: string;
    description?: string;
    save(request: EchoPluginBackupRequest): unknown | Promise<unknown>;
    list(request: EchoPluginBackupRequest): BackupProviderEntry[] | Promise<BackupProviderEntry[]>;
    load(
      request: EchoPluginBackupRequest,
    ): ArrayBuffer | ArrayBufferView | Promise<ArrayBuffer | ArrayBufferView>;
    remove?(request: EchoPluginBackupRequest): unknown | Promise<unknown>;
  }
  /** One provider invocation. context owns cancellable requests/timers; track links an existing operation. */
  export interface EchoPluginBackupRequest {
    readonly id: string;
    readonly fileName: string;
    readonly data: ArrayBuffer;
    readonly summary: BackupSummary;
    readonly active: boolean;
    readonly canceled: boolean;
    readonly context: EchoPluginContext | null;
    readonly changed: QtSignal;
    track<T>(operation: EchoPluginOperation<T>): EchoPluginOperation<T> | null;
  }
  export interface EchoPluginBackups {
    create(scope?: BackupScope): EchoPluginOperation<BackupArchive>;
    inspect(data: ArrayBuffer): EchoPluginOperation<BackupInspection>;
    /** Presents host confirmation. Success means a restore/restart has been scheduled. */
    restore(token: string, scope?: BackupScope): EchoPluginOperation<BackupRestoreResult>;
    /** Main activation only; removing the registration cancels its running storage invocation. */
    registerProvider(
      id: string,
      definition: BackupProviderDefinition,
    ): EchoPluginRegistration | null;
  }

  export interface EchoPluginSqlite {
    readonly drained: QtSignal;
    open(options?: SqliteOpenOptions): EchoPluginOperation<EchoPluginDatabase>;
    listDatabases(): EchoPluginOperation<SqliteDatabaseInfo[]>;
    /** Requires all handles, including those in other presentation scopes, closed. */
    deleteDatabase(name: string): EchoPluginOperation<boolean>;
  }

  export interface EchoPluginIo {
    readonly drained: QtSignal;
    readValue(key: string): EchoPluginOperation<JsonValue | undefined>;
    writeValue(key: string, value: JsonValue): EchoPluginOperation;
    removeValue(key: string): EchoPluginOperation;
  }
  export interface KugouCommentQuery {
    resource?: 'music' | 'album' | 'playlist';
    section?: 'all' | 'category' | 'hotWord' | 'floor';
    id?: string;
    threadId?: string;
    hotWord?: string;
    code?: string;
    mixSongId?: string;
    categoryId?: string;
    page?: number;
    pageSize?: number;
  }
  export interface KugouCommentWrite {
    resource?: 'music' | 'album' | 'playlist';
    id?: string;
    name?: string;
    content?: string;
    commentId?: string;
    threadId?: string;
    parentId?: string;
    replyUserName?: string;
    replyContent?: string;
    code?: string;
    mixSongId?: string;
  }
  export interface KugouProfilePatch {
    nickname?: string;
    birthday?: string;
    signature?: string;
    province?: string;
    city?: string;
    gender?: number;
  }
  export interface KugouPreferencePatch {
    mode?: string;
    gender?: string;
    age?: string;
    languages?: string;
    styles?: string;
    recommendation?: string;
  }
  export interface KugouLoginDeviceTarget {
    mid: string;
    transportFingerprint: string;
    activeAtSeconds: number;
    appId: string;
    clientVersion: number;
  }
  export interface KugouCloudDeleteTarget {
    kvId: string;
    albumAudioId?: string;
  }
  export interface KugouPlaylistTrackInput {
    title: string;
    hash: string;
    albumId: string;
    songId: string;
  }
  export interface KugouPlaylistTrackPosition {
    fileId: string;
    position: number;
  }
  export interface KugouPlaylistPosition {
    id: string;
    kind?: 'owned' | 'collected';
    position: number;
  }
  export interface KugouPlaylistUpdate {
    kind?: 'owned' | 'collected';
    id: string;
    totalRevision: number;
    sortIndex: number;
    title?: string;
    description?: string;
    tags?: string;
    coverReference?: string;
  }
  export interface KugouCollectionTarget {
    title: string;
    source?: number;
    creatorId?: string;
    creatorListId?: string;
    creatorGlobalId?: string;
  }
  export interface KugouPrivilegeResource {
    hash: string;
    albumId?: string;
  }
  export interface KugouFmRequest {
    mode?: 'normal' | 'small' | 'peak' | 'radio';
    action?: 'play' | 'login' | 'garbage' | 'clickRed' | 'cancelRed' | 'changeSongPool';
    pool?: number;
    remaining?: number;
    overplay?: boolean;
    hash?: string;
    mark?: string;
    audioId?: string;
    playSeconds?: number;
  }
  export interface KugouListenRoomAudio {
    hash: string;
    songId: string;
  }
  export interface KugouListenRoomProgress {
    audio: KugouListenRoomAudio;
    positionMs?: number;
    playing?: boolean;
    playMode?: number;
  }
  export interface KugouListenRoomRequest {
    action?:
      'create' | 'status' | 'join' | 'state' | 'heartbeat' | 'leave' | 'dismiss' | 'updateChat';
    roomId?: string;
    name?: string;
    privacy?: number;
    capacity?: number;
    chatEnabled?: boolean;
  }
  export interface KugouListenMusicRequest {
    action?:
      | 'list'
      | 'history'
      | 'detail'
      | 'members'
      | 'initialize'
      | 'sync'
      | 'playbackUrl'
      | 'switch'
      | 'player'
      | 'playlist'
      | 'recentPlaylist'
      | 'orderSong'
      | 'songOrders'
      | 'removeSong'
      | 'addSongs';
    roomId?: string;
    tags?: string;
    version?: string;
    requesterId?: string;
    page?: number;
    pageSize?: number;
    cursor?: number;
    audios?: readonly KugouListenRoomAudio[];
    audio?: KugouListenRoomAudio;
    progress?: KugouListenRoomProgress;
    command?: 'mode' | 'seek' | 'playing';
    positionMs?: number;
    playMode?: number;
    playing?: boolean;
    automatic?: boolean;
  }
  export interface KugouListenChatRequest {
    action?: 'send' | 'history';
    roomId?: string;
    text?: string;
    nickname?: string;
    avatarUrl?: string;
    maxId?: string;
  }
  export interface KugouDto_domain_HotSearchGroup {
    readonly title: string;
    readonly keywords: KugouDto_domain_HotKeyword[];
  }
  export interface KugouDto_domain_HotKeyword {
    readonly keyword: string;
    readonly reason: string;
    readonly kind: number | null;
    readonly icon: number | null;
    readonly jump_url: string;
    readonly json_url: string;
  }
  export interface KugouDto_search_default_DefaultSearch {
    readonly promotions: KugouDto_search_default_Promotion[];
    readonly fallback_extension: JsonValue | null;
  }
  export interface KugouDto_search_default_Promotion {
    readonly id: string | null;
    readonly title: string;
    readonly main_title: string;
    readonly subtitle: string;
    readonly jump_type: string;
    readonly encoded_destination: string;
  }
  export interface KugouDto_search_suggest_Suggestions {
    readonly groups: KugouDto_search_suggest_SuggestionGroup[];
    readonly singer_shortcut_extension: JsonValue | null;
    readonly shortcuts_extension: JsonValue | null;
  }
  export interface KugouDto_search_suggest_SuggestionGroup {
    readonly title: string;
    readonly reported_count: number | null;
    readonly items: KugouDto_search_suggest_Suggestion[];
  }
  export interface KugouDto_search_suggest_Suggestion {
    readonly text: string;
    readonly matches: number | null;
    readonly heat: number | null;
    readonly source: string;
    readonly subtitle: string;
    readonly tags: string[] | null;
    readonly jump: KugouDto_search_suggest_Jump | null;
  }
  export interface KugouDto_search_suggest_Jump {
    readonly type: string;
    readonly id: string | null;
    readonly url: string;
  }
  export interface KugouDto_album_dycover_DynamicCover {
    readonly album_id: string;
    readonly urls: string[];
  }
  export interface KugouDto_song_climax_ClimaxSegment {
    readonly start_ms: number | null;
    readonly end_ms: number | null;
    readonly hash: string | null;
  }
  export interface KugouDto_top_playlist_PlaylistCard {
    readonly id: string;
    readonly title: string;
    readonly creator: string;
    readonly cover_url: string;
    readonly song_count: number | null;
    readonly metadata: KugouDto_top_playlist_PlaylistMetadata;
  }
  export interface KugouDto_top_playlist_PlaylistMetadata {
    readonly public_id: string | null;
    readonly alternate_global_id: string | null;
    readonly creator_id: string | null;
    readonly creator_avatar_url: string | null;
    readonly description: string | null;
    readonly tags: KugouDto_top_playlist_PlaylistTag[];
    readonly play_count: number | null;
    readonly collection_count: number | null;
    readonly published_at: string | null;
    readonly source_code: number | null;
    readonly kind_code: number | null;
    readonly alternate_cover_url: string | null;
  }
  export interface KugouDto_top_playlist_PlaylistTag {
    readonly id: string;
    readonly name: string;
  }
  export interface KugouDto_everyday_style_recommend_StyleRecommendations {
    readonly songs: KugouDto_discovery_DiscoverySong[];
    readonly groups: KugouDto_everyday_style_recommend_Group[];
  }
  export interface KugouDto_discovery_DiscoverySong extends KugouDto_domain_SongSummary {
    readonly metadata: KugouDto_discovery_SongMetadata;
  }
  export interface KugouDto_domain_SongSummary {
    readonly id: string;
    readonly hash: string;
    readonly title: string;
    readonly artists: KugouDto_domain_ArtistRef[];
    readonly album_id: string;
    readonly album_title: string | null;
    readonly duration_ms: number | null;
    readonly cover_url: string;
    readonly privilege: number | null;
  }
  export interface KugouDto_domain_ArtistRef {
    readonly id: string | null;
    readonly name: string;
  }
  export interface KugouDto_discovery_SongMetadata {
    readonly audio_id: string | null;
    readonly original_title: string | null;
    readonly official_title: string | null;
    readonly title_suffix: string | null;
    readonly album_audio_remark: string;
    readonly source_file_name: string;
    readonly language: string | null;
    readonly published_at: string | null;
    readonly publication_code: number | null;
    readonly originality_code: number | null;
    readonly has_accompaniment: boolean | null;
    readonly accompaniment_code: number | null;
    readonly related_goods_extension: JsonValue | null;
    readonly provider_extension: JsonValue | null;
    readonly payment_type: number | null;
    readonly failure_code: number | null;
    readonly old_copyright_code: number | null;
    readonly rights: KugouDto_discovery_CatalogRights;
    readonly resources: KugouDto_discovery_AudioResource[];
    readonly videos: KugouDto_discovery_VideoReference[];
    readonly tags: KugouDto_discovery_SongTag[];
    readonly ip_tags: KugouDto_discovery_SongTag[];
    readonly recommendation: KugouDto_discovery_RecommendationText;
    readonly ranking: KugouDto_discovery_RankingPosition | null;
    readonly artists: KugouDto_discovery_ArtistDetail[];
    readonly related_versions: KugouDto_discovery_RelatedVersion[];
  }
  export interface KugouDto_discovery_CatalogRights {
    readonly quality_map: KugouDto_privilege_lite_QualityMap | null;
    readonly classification: Record<string, number | null> | null;
    readonly ip_map: KugouDto_discovery_EncodedMap | null;
    readonly copyright_attributes: number | null;
    readonly copyright_scope: string | null;
    readonly copyright_grade: number | null;
    readonly copyright_level: number | null;
    readonly display_code: number | null;
    readonly display_rate: number | null;
    readonly payment_template: number | null;
    readonly blocked_applications: string | null;
    readonly originality_code: number | null;
    readonly advance_code: number | null;
    readonly preview: KugouDto_privilege_lite_PreviewRange | null;
    readonly multitrack_hash: string | null;
    readonly cover_url: string | null;
    readonly audio_privilege: number | null;
    readonly free_for_ad: number | null;
    readonly free_limited: number | null;
    readonly voice_ad: KugouDto_discovery_VoiceAd | null;
  }
  export interface KugouDto_privilege_lite_QualityMap {
    readonly attr0: number | null;
    readonly attr1: number | null;
    readonly bits: string | null;
  }
  export interface KugouDto_discovery_EncodedMap {
    readonly attr0: number | null;
    readonly bits: string | null;
  }
  export interface KugouDto_privilege_lite_PreviewRange {
    readonly start_byte: number | null;
    readonly end_byte: number | null;
    readonly start_ms: number | null;
    readonly end_ms: number | null;
    readonly offset_hash: string | null;
    readonly file_type: number | null;
    readonly clip_hash: string | null;
  }
  export interface KugouDto_discovery_VoiceAd {
    readonly start_ms: number | null;
    readonly size_bytes: number | null;
    readonly hash: string | null;
  }
  export interface KugouDto_discovery_AudioResource {
    readonly quality: string;
    readonly hash: string | null;
    readonly size_bytes: number | null;
    readonly duration_ms: number | null;
    readonly bit_rate_bps: number | null;
    readonly extension: string | null;
    readonly privilege: number | null;
    readonly payment_type: number | null;
    readonly failure_code: number | null;
    readonly download_status: number | null;
  }
  export interface KugouDto_discovery_VideoReference {
    readonly id: string | null;
    readonly hash: string | null;
    readonly kind: number | null;
    readonly track: string | null;
    readonly duration_ms: number | null;
    readonly size_bytes: number | null;
  }
  export interface KugouDto_discovery_SongTag {
    readonly id: string | null;
    readonly name: string | null;
    readonly parent_id: string | null;
  }
  export interface KugouDto_discovery_RecommendationText {
    readonly headline: string;
    readonly detail: string;
    readonly rank_label: string | null;
  }
  export interface KugouDto_discovery_RankingPosition {
    readonly rank_id: string;
    readonly issue: string;
    readonly rank_cid: number | null;
    readonly position: number | null;
    readonly previous_position: number | null;
    readonly original_position: number | null;
    readonly previous_original_position: number | null;
    readonly change: number | null;
    readonly published_at: string;
  }
  export interface KugouDto_discovery_ArtistDetail {
    readonly id: string | null;
    readonly name: string;
    readonly avatar_url: string | null;
    readonly publication_code: number | null;
  }
  export interface KugouDto_discovery_RelatedVersion {
    readonly album_audio_id: string;
    readonly remark: string;
    readonly kind: number | null;
  }
  export interface KugouDto_everyday_style_recommend_Group {
    readonly name: string;
    readonly child: KugouDto_everyday_style_recommend_Tag[];
  }
  export interface KugouDto_everyday_style_recommend_Tag {
    readonly id: string;
    readonly name: string;
    readonly default: number | null;
  }
  export interface KugouDto_everyday_recommend_DailyRecommendations {
    readonly songs: KugouDto_discovery_DiscoverySong[];
    readonly date: string;
    readonly subtitle: string;
  }
  export interface KugouDto_ai_recommend_song_FreeListenSongs {
    readonly songs: KugouDto_discovery_DiscoverySong[];
    readonly card_info: KugouDto_ai_recommend_song_CardInfo | null;
  }
  export interface KugouDto_ai_recommend_song_CardInfo {
    readonly card_title: string;
    readonly card_id: string | null;
  }
  export interface KugouDto_home_discover_DiscoverRecommendations {
    readonly items: KugouDto_home_discover_DiscoverItem[];
    readonly unmapped_items: JsonValue[];
  }
  export interface KugouDto_home_discover_DiscoverItem {
    readonly item_id: string;
    readonly alg_path: string;
    readonly start_time: string | null;
    readonly song: KugouDto_discovery_DiscoverySong;
  }
  export interface KugouDto_top_song_NewSongs {
    readonly total: number | null;
    readonly songs: KugouDto_top_song_NewSong[];
  }
  export interface KugouDto_top_song_NewSong extends KugouDto_domain_SongSummary {
    readonly metadata: KugouDto_top_song_Metadata;
  }
  export interface KugouDto_top_song_Metadata extends KugouDto_discovery_SongMetadata {
    readonly chart: KugouDto_top_song_Chart;
    readonly default_alias_codes: (number | null)[];
  }
  export interface KugouDto_top_song_Chart {
    readonly rank_id: string;
    readonly issue: string;
    readonly rank_cid: number | null;
    readonly position: number | null;
    readonly previous_position: number | null;
    readonly change: number | null;
  }
  export interface KugouDto_top_album_Albums {
    readonly regions: Record<string, KugouDto_top_album_AlbumCard[]>;
    readonly timestamp: number | null;
  }
  export interface KugouDto_top_album_AlbumCard {
    readonly id: string;
    readonly title: string;
    readonly creator: string;
    readonly cover_url: string;
    readonly song_count: number | null;
    readonly published_at: string;
    readonly metadata: KugouDto_top_album_Metadata;
  }
  export interface KugouDto_top_album_Metadata {
    readonly artist_id: string | null;
    readonly advertisement_id: string | null;
    readonly description: string;
    readonly first_release_code: number | null;
    readonly privilege: number | null;
    readonly quality_code: number | null;
    readonly special_tag: string;
  }
  export interface KugouDto_playlist_tags_Category {
    readonly id: string;
    readonly name: string;
    readonly parent_id: string;
    readonly position: number | null;
    readonly children: KugouDto_playlist_tags_Category[];
  }
  export interface KugouDto_artist_lists_Directory {
    readonly groups: KugouDto_artist_lists_ArtistGroup[];
    readonly sex_filters: KugouDto_artist_lists_Filter[];
    readonly type_filters: KugouDto_artist_lists_Filter[];
    readonly timestamp: number | null;
  }
  export interface KugouDto_artist_lists_ArtistGroup {
    readonly label: string;
    readonly artists: KugouDto_artist_lists_ArtistCard[];
  }
  export interface KugouDto_artist_lists_ArtistCard {
    readonly id: string;
    readonly title: string;
    readonly creator: string;
    readonly cover_url: string;
    readonly metadata: KugouDto_artist_lists_Metadata;
  }
  export interface KugouDto_artist_lists_Metadata {
    readonly album_count: number | null;
    readonly song_count: number | null;
    readonly fans_count: number | null;
    readonly mv_count: number | null;
    readonly description: string | null;
    readonly introduction: string;
    readonly settled_code: number | null;
    readonly heat: number | null;
    readonly heat_change: number | null;
    readonly sort_change: number | null;
    readonly dynamic_frame_url: string;
  }
  export interface KugouDto_artist_lists_Filter {
    readonly id: string;
    readonly label: string;
    readonly category: number;
    readonly musician: number | null;
  }
  export interface KugouDto_rank_catalog_Rank {
    readonly id: string | null;
    readonly title: string;
    readonly cover_url: string;
    readonly description: string;
    readonly update_frequency: string;
    readonly published_at: string | null;
    readonly category: number | null;
  }
  export interface KugouDto_rank_audio_RankSongs {
    readonly total: number | null;
    readonly songs: KugouDto_discovery_DiscoverySong[];
  }
  export interface KugouDto_song_ranking_Ranking extends Record<string, JsonValue> {
    readonly album_audio_id: string | null;
    readonly platform_num: number | null;
    readonly platform_total: number | null;
    readonly title1: string;
    readonly title2: string;
    readonly info: KugouDto_song_ranking_Achievement[];
  }
  export interface KugouDto_song_ranking_Achievement extends Record<string, JsonValue> {
    readonly platform: number | null;
    readonly ranking_num: number | null;
    readonly ranking_times: number | null;
    readonly platform_name: string;
    readonly platform_logo: string;
    readonly last_time: string;
  }
  export interface KugouDto_song_ranking_filter_Ranking extends Record<string, JsonValue> {
    readonly list: KugouDto_song_ranking_filter_Achievement[];
  }
  export interface KugouDto_song_ranking_filter_Achievement extends Record<string, JsonValue> {
    readonly area: number | null;
    readonly count: number | null;
    readonly platform: number | null;
    readonly top_ranking: number | null;
    readonly logo_pic: string;
    readonly name: string;
    readonly platform_name: string;
    readonly share_pic: string;
  }
  export interface KugouDto_favorite_count_Count extends Record<string, JsonValue> {
    readonly mixsongid: number | null;
    readonly count: number | null;
    readonly count_text: string;
  }
  export interface KugouDto_video_Video {
    readonly audio_fallback_facts: KugouDto_video_AudioFallbackFacts | null;
    readonly audio_fallback_eligible: boolean | null;
    readonly id: string | null;
    readonly song_id: string | null;
    readonly title: string;
    readonly artist: string;
    readonly artists: KugouDto_video_Artist[];
    readonly cover_url: string;
    readonly description: string;
    readonly published_at: string;
    readonly duration_ms: number | null;
    readonly play_count: number | null;
    readonly collection_count: number | null;
    readonly download_count: number | null;
    readonly recommendation_code: number | null;
    readonly sources: KugouDto_video_Source[];
    readonly encodings: KugouDto_video_Encoding[];
    readonly tags: KugouDto_video_Tag[];
    readonly edition: string;
    readonly extension: Record<string, JsonValue>;
  }
  export interface KugouDto_video_AudioFallbackFacts {
    readonly published_code: number | null;
    readonly ugc_code: number | null;
    readonly short_code: number | null;
    readonly other_code: number | null;
    readonly status_code: number | null;
  }
  export interface KugouDto_video_Artist {
    readonly id: string | null;
    readonly name: string;
    readonly avatar_url: string;
    readonly extension: Record<string, JsonValue>;
  }
  export interface KugouDto_video_Source {
    readonly hash: string;
    readonly quality: string;
    readonly codec: string;
    readonly width: number | null;
    readonly height: number | null;
    readonly size_bytes: number | null;
    readonly bit_rate: number | null;
  }
  export interface KugouDto_video_Encoding {
    readonly codec: string;
    readonly facts: KugouDto_video_Resolutions;
  }
  export interface KugouDto_video_Resolutions extends Record<string, JsonValue> {
    readonly ld_hash: string;
    readonly ld_width: number | null;
    readonly ld_height: number | null;
    readonly ld_filesize: number | null;
    readonly ld_bitrate: number | null;
    readonly sd_hash: string;
    readonly sd_width: number | null;
    readonly sd_height: number | null;
    readonly sd_filesize: number | null;
    readonly sd_bitrate: number | null;
    readonly hd_hash: string;
    readonly hd_width: number | null;
    readonly hd_height: number | null;
    readonly hd_filesize: number | null;
    readonly hd_bitrate: number | null;
    readonly fhd_hash: string;
    readonly fhd_width: number | null;
    readonly fhd_height: number | null;
    readonly fhd_filesize: number | null;
    readonly fhd_bitrate: number | null;
    readonly qhd_hash: string;
    readonly qhd_width: number | null;
    readonly qhd_height: number | null;
    readonly qhd_filesize: number | null;
    readonly qhd_bitrate: number | null;
  }
  export interface KugouDto_video_Tag extends Record<string, JsonValue> {
    readonly tag_id: string | null;
    readonly tag_name: string;
  }
  export interface KugouDto_video_privilege_Row extends Record<string, JsonValue> {
    readonly hash: string;
    readonly name: string;
    readonly singer_name: string;
    readonly id: string | null;
    readonly privilege: number | null;
    readonly status: number | null;
    readonly level: number | null;
    readonly pay_type: number | null;
    readonly relate_goods: KugouDto_video_privilege_Row[];
  }
  export interface KugouDto_video_url_VideoUrl {
    readonly url: string;
    readonly backup_urls: string[];
    readonly size_bytes: number | null;
    readonly privilege: JsonValue | null;
    readonly extension: Record<string, JsonValue>;
  }
  export interface KugouDto_mv_collect_Ack {
    readonly accepted: boolean;
  }
  export interface KugouDto_comment_Page {
    readonly resource_id: string;
    readonly page: number | null;
    readonly total: number | null;
    readonly reply_total: number | null;
    readonly maximum_page: number | null;
    readonly service_code: number | null;
    readonly message: string;
    readonly comments: KugouDto_comment_Comment[];
    readonly singer_comments: KugouDto_comment_Comment[];
    readonly categories: KugouDto_comment_Category[];
    readonly hot_words: KugouDto_comment_HotWord[];
    readonly extension: Record<string, JsonValue>;
  }
  export interface KugouDto_comment_Comment {
    readonly id: string;
    readonly resource_id: string;
    readonly category_id: string;
    readonly resource_name: string;
    readonly display_text: string;
    readonly code: string;
    readonly thread_id: string;
    readonly parent_id: string;
    readonly original_id: string;
    readonly content: string;
    readonly parent_content: string;
    readonly parent_user_id: string;
    readonly user_id: string;
    readonly user_name: string;
    readonly avatar_url: string;
    readonly created_at: string;
    readonly location: string;
    readonly mix_song_id: string | null;
    readonly reply_count: number | null;
    readonly comments_count: number | null;
    readonly vip_type: number | null;
    readonly young_vip_type: number | null;
    readonly svip_level: number | null;
    readonly reply_code: number | null;
    readonly published_code: number | null;
    readonly likes: KugouDto_comment_Likes;
    readonly identity: KugouDto_comment_IdentityInfo;
    readonly decoration: KugouDto_comment_Decoration;
    readonly membership: KugouDto_comment_Membership;
    readonly images: KugouDto_comment_Image[];
    readonly previews: KugouDto_comment_Comment[];
    readonly extension: Record<string, JsonValue>;
  }
  export interface KugouDto_comment_Likes extends Record<string, JsonValue> {
    readonly count: number | null;
    readonly haslike: boolean | null;
    readonly hasoppose: boolean | null;
    readonly likenum: number | null;
    readonly opposenum: number | null;
  }
  export interface KugouDto_comment_IdentityInfo extends Record<string, JsonValue> {
    readonly star_v_status: number | null;
    readonly tme_star_status: number | null;
    readonly actor_status: number | null;
    readonly biz_status: number | null;
    readonly cmt_talent_status: number | null;
    readonly user_iden: number | null;
    readonly singer_status: number | null;
    readonly student_status: number | null;
    readonly auth_info: string;
    readonly pic: string;
    readonly user_label: string;
  }
  export interface KugouDto_comment_Decoration extends Record<string, JsonValue> {
    readonly pendant_url: string;
    readonly pendant_dynamic: string;
    readonly pendant_name: string;
    readonly small_pic_v3: string;
    readonly word_v3: string;
    readonly singer_avatar: string;
  }
  export interface KugouDto_comment_Membership extends Record<string, JsonValue> {
    readonly vip_type: number | null;
    readonly y_type: number | null;
    readonly m_type: number | null;
    readonly user_type: number | null;
    readonly user_y_type: number | null;
  }
  export interface KugouDto_comment_Image extends Record<string, JsonValue> {
    readonly url: string;
    readonly width: number | null;
    readonly height: number | null;
    readonly label: string;
  }
  export interface KugouDto_comment_Category extends Record<string, JsonValue> {
    readonly id: string | null;
    readonly label: string;
    readonly icon: string;
    readonly cnt: number | null;
  }
  export interface KugouDto_comment_HotWord extends Record<string, JsonValue> {
    readonly content: string;
    readonly count: number | null;
  }
  export interface KugouDto_comment_write_Acknowledgement {
    readonly accepted: boolean;
  }
  export interface KugouDto_album_detail_AlbumDetail {
    readonly id: string | null;
    readonly title: string;
    readonly artists: KugouDto_domain_ArtistRef[];
    readonly cover_url: string;
    readonly published_at: string;
    readonly description: string;
    readonly language: string;
    readonly category: string;
    readonly heat: number | null;
    readonly quality: number | null;
    readonly exclusive: boolean | null;
    readonly published: boolean | null;
  }
  export interface KugouDto_album_songs_AlbumTracks {
    readonly page: KugouDto_domain_Page<KugouDto_album_songs_AlbumTrack>;
    readonly disc_count: number | null;
  }
  export interface KugouDto_domain_Page<T> {
    readonly page: number | null;
    readonly page_size: number | null;
    readonly total: number | null;
    readonly items: T[];
  }
  export interface KugouDto_album_songs_AlbumTrack {
    readonly song: KugouDto_domain_SongSummary;
    readonly metadata: KugouDto_discovery_CatalogSongFacts;
    readonly disc: number | null;
    readonly position: number | null;
    readonly has_accompaniment: boolean | null;
    readonly accompaniment_code: number | null;
  }
  export interface KugouDto_discovery_CatalogSongFacts {
    readonly payment_type: number | null;
    readonly failure_code: number | null;
    readonly old_copyright_code: number | null;
    readonly originality_code: number | null;
    readonly rights: KugouDto_discovery_CatalogRights | null;
    readonly resources: KugouDto_discovery_AudioResource[];
  }
  export interface KugouDto_artist_detail_ArtistDetail {
    readonly id: string | null;
    readonly name: string;
    readonly avatar_url: string;
    readonly description: string;
    readonly birthday: string;
    readonly fans: number | null;
    readonly album_count: number | null;
    readonly mv_count: number | null;
    readonly published: boolean | null;
  }
  export interface KugouDto_artist_audios_new_ArtistSong extends KugouDto_domain_SongSummary {
    readonly metadata: KugouDto_discovery_CatalogSongFacts;
  }
  export interface KugouDto_domain_AlbumSummary {
    readonly id: string | null;
    readonly title: string;
    readonly artists: KugouDto_domain_ArtistRef[];
    readonly cover_url: string;
    readonly song_count: number | null;
    readonly published_at: string;
  }
  export interface KugouDto_domain_Profile {
    readonly id: string;
    readonly nickname: string;
    readonly avatar_url: string;
    readonly gender: number | null;
    readonly vip_type: number | null;
    readonly follows: number | null;
    readonly fans: number | null;
    readonly biography: string;
    readonly friends: number | null;
    readonly grade: number | null;
    readonly listening_minutes: number | null;
    readonly visitors: number | null;
    readonly registered_at_seconds: number | null;
    readonly province: string;
    readonly city: string;
    readonly ip_location: string;
    readonly birthday: string;
    readonly identity: KugouDto_domain_ProfileIdentity;
  }
  export interface KugouDto_domain_ProfileIdentity {
    readonly actor_code: number | null;
    readonly business_code: number | null;
    readonly star_code: number | null;
    readonly singer_code: number | null;
    readonly legacy_star_code: number | null;
    readonly talent_bits: number | null;
    readonly actor: boolean;
    readonly business: boolean;
    readonly star: boolean;
    readonly singer: boolean;
    readonly authorizations: string[];
    readonly talent_authorizations: string[];
    readonly singer_authorizations: string[];
  }
  export interface KugouDto_user_info_UserIdentity {
    readonly student_status: number | null;
    readonly student_school: string;
    readonly student_expire_time: string;
    readonly tags: string[];
  }
  export interface KugouDto_user_vip_detail_Memberships {
    readonly user_id: string;
    readonly vip_type_code: number | null;
    readonly user_type_code: number | null;
    readonly deluxe_begins_at: string | null;
    readonly super_begins_at: string | null;
    readonly deluxe_expires_at: string | null;
    readonly super_expires_at: string | null;
    readonly products: KugouDto_user_vip_detail_MembershipProduct[];
  }
  export interface KugouDto_user_vip_detail_MembershipProduct {
    readonly active: boolean | null;
    readonly active_code: number | null;
    readonly product: string;
    readonly business: string;
    readonly begins_at: string | null;
    readonly expires_at: string | null;
  }
  export interface KugouDto_user_grade_info_ListeningGrade {
    readonly user_id: string;
    readonly grade: number | null;
    readonly listening_seconds: number | null;
    readonly current_points: number | null;
    readonly grade_points: number | null;
    readonly next_grade_points: number | null;
    readonly next_grade: number | null;
  }
  export interface KugouDto_user_follow_add_FollowChange {
    readonly following: boolean;
    readonly mutual: boolean | null;
    readonly already: boolean;
  }
  export interface KugouDto_user_follow_message_History {
    readonly records: JsonValue[];
    readonly ended: boolean | null;
  }
  export interface KugouDto_user_follow_chat_Data {
    readonly msgid: string;
    readonly tag: string;
    readonly addtime: number | null;
  }
  export interface KugouDto_domain_LoginDevice {
    readonly id: string;
    readonly transport_fingerprint: string;
    readonly model: string;
    readonly platform: string;
    readonly location: string;
    readonly login_type: number | null;
    readonly active_at_seconds: number | null;
    readonly new_at_seconds: number | null;
    readonly app_id: string | null;
    readonly client_version: number | null;
    readonly current: boolean;
  }
  export interface KugouDto_user_update_avatar_AvatarUpdate {
    readonly avatar_url: string;
    readonly review_pending: boolean;
  }
  export interface KugouDto_user_preference_Preferences {
    readonly recommendation_mode: string | null;
    readonly gender: string | null;
    readonly age: string | null;
    readonly languages: KugouDto_user_preference_WeightPreference;
    readonly styles: KugouDto_user_preference_WeightPreference;
    readonly recommendation: KugouDto_user_preference_WeightPreference;
  }
  export interface KugouDto_user_preference_WeightPreference {
    readonly encoded: string | null;
    readonly weights: Record<string, number> | null;
    readonly raw: JsonValue;
  }
  export interface KugouDto_user_playlist_UserPlaylists {
    readonly page: KugouDto_domain_Page<KugouDto_user_playlist_UserPlaylist>;
    readonly user_id: string;
    readonly total_revision: number;
    readonly collection_count: number | null;
    readonly album_count: number | null;
  }
  export interface KugouDto_user_playlist_UserPlaylist {
    readonly description_present: boolean;
    readonly tags_present: boolean;
    readonly cloud_list_id: string | null;
    readonly global_id: string;
    readonly creator_global_id: string;
    readonly title: string;
    readonly description: string;
    readonly tags: string;
    readonly cover_url: string;
    readonly creator_id: string | null;
    readonly creator_name: string;
    readonly creator_list_id: string | null;
    readonly song_count: number | null;
    readonly revision: number;
    readonly sort_index: number | null;
    readonly source_code: number | null;
    readonly kind: KugouDto_user_playlist_CloudPlaylistKind;
    readonly kind_code: number | null;
    readonly editable: boolean | null;
    readonly private: boolean | null;
    readonly published: boolean | null;
    readonly deleted: boolean | null;
    readonly dropped: boolean | null;
    readonly custom_cover: boolean | null;
    readonly default_kind: number | null;
    readonly flag_codes: KugouDto_user_playlist_PlaylistFlagCodes;
    readonly created_at_seconds: number | null;
    readonly updated_at_seconds: number | null;
  }

  export type KugouDto_user_playlist_CloudPlaylistKind = 'owned' | 'collected' | 'unknown';
  export interface KugouDto_user_playlist_PlaylistFlagCodes {
    readonly editable: number | null;
    readonly private: number | null;
    readonly published: number | null;
    readonly deleted: number | null;
    readonly dropped: number | null;
    readonly custom_cover: number | null;
  }
  export interface KugouDto_user_cloud_CloudFilesPage {
    readonly page: KugouDto_domain_Page<KugouDto_user_cloud_CloudFileTrack>;
    readonly counters: KugouDto_user_cloud_CloudCounters;
  }
  export interface KugouDto_user_cloud_CloudFileTrack {
    readonly source_file_name: string;
    readonly song: KugouDto_domain_SongSummary;
    readonly file_id: string | null;
    readonly added_at_seconds: number | null;
    readonly sort_index: number | null;
    readonly size_bytes: number | null;
    readonly bit_rate_bps: number | null;
    readonly extension: string;
    readonly hash_std: string;
    readonly audio_id: string | null;
    readonly kmr_album_audio_id: string | null;
    readonly album_category: number | null;
    readonly album_published_code: number | null;
    readonly album_published_at: string;
    readonly mv_id: string;
    readonly mv_hash: string;
    readonly mv_type: number | null;
    readonly mv_track: string;
    readonly provider_extension: JsonValue | null;
  }
  export interface KugouDto_user_cloud_CloudCounters {
    readonly list_count: number | null;
    readonly list_ver: number | null;
    readonly used_size: number | null;
    readonly availble_size: number | null;
    readonly max_size: number | null;
    readonly user_type: number | null;
    readonly type_size: Record<string, number | null> | null;
  }
  export interface KugouDto_user_cloud_match_Matches {
    readonly matches: KugouDto_user_cloud_match_Match[];
    readonly extensions: JsonValue[];
  }
  export interface KugouDto_user_cloud_match_Match extends Record<string, JsonValue> {
    readonly album_audio_id: string | null;
    readonly audio_id: string | null;
    readonly author_name: string;
    readonly songname: string;
    readonly audio_info: KugouDto_user_cloud_match_Audio | null;
  }
  export interface KugouDto_user_cloud_match_Audio extends Record<string, JsonValue> {
    readonly hash: string;
  }
  export interface KugouDto_user_video_collect_VideoPage {
    readonly page: KugouDto_domain_Page<KugouDto_user_video_collect_VideoSummary>;
    readonly revision: number | null;
  }
  export interface KugouDto_user_video_collect_VideoSummary {
    readonly id: string | null;
    readonly previous_id: string | null;
    readonly title: string;
    readonly artist: string;
    readonly provider: string;
    readonly cover_url: string;
    readonly preview_size_bytes: number | null;
    readonly duration_ms: number | null;
    readonly collected_at_seconds: number | null;
    readonly published: number | null;
    readonly short: number | null;
    readonly author_id: string | null;
    readonly author_avatar_url: string | null;
    readonly remark: string;
    readonly intro: string;
    readonly relate_song_id: string | null;
    readonly related_song: KugouDto_user_video_collect_VideoRelatedSong | null;
    readonly variants: KugouDto_user_video_collect_VideoVariant[];
    readonly provider_extension: JsonValue | null;
  }
  export interface KugouDto_user_video_collect_VideoRelatedSong {
    readonly album_audio_id: string | null;
    readonly audio_hash: string | null;
    readonly name: string | null;
    readonly artist: string | null;
    readonly cover_url: string | null;
    readonly original_code: number | null;
    readonly vip_code: number | null;
    readonly privilege: number | null;
    readonly like_rate: number | null;
    readonly start_position_ms: number | null;
    readonly label_list: JsonValue | null;
    readonly provider_extension: JsonValue | null;
  }
  export interface KugouDto_user_video_collect_VideoVariant {
    readonly quality: string;
    readonly hash: string | null;
    readonly size_bytes: number | null;
  }
  export interface KugouDto_import_playlist_ImportTask {
    readonly task_id: string;
    readonly user_id: string;
    readonly cloud_list_id: string;
    readonly source: number;
    readonly task_type: number | null;
    readonly status: number;
    readonly title: string;
    readonly total: number | null;
    readonly matched: number | null;
    readonly imported: number | null;
    readonly missed: number | null;
    readonly message: string;
  }
  export interface KugouDto_playlist_pic_upload_UploadedCover {
    readonly file_name: string;
    readonly reference: string;
  }
  export interface KugouDto_domain_LibraryPlaylistChange {
    readonly user_id: string;
    readonly cloud_list_id: string;
    readonly previous_total_revision: number;
    readonly total_revision: number;
    readonly playlist_count: number | null;
    readonly cover_url?: string | null;
  }
  export interface KugouDto_audio_effect_Effect {
    readonly id: string;
    readonly name: string;
    readonly author: string;
    readonly intro: string;
    readonly icon_url: string;
    readonly labels: string[];
    readonly user_count: number | null;
    readonly source: string;
    readonly sound_urls: string[];
    readonly vpf_urls: string[];
    readonly file_size: number | null;
    readonly unavailable_reason: string | null;
  }
  export interface KugouDto_search_lyric_Candidate {
    readonly source_id: string;
    readonly access_key: string;
    readonly artist: string;
    readonly nickname: string;
    readonly title: string;
    readonly duration_ms: number | null;
    readonly source_label: string;
    readonly language: string;
    readonly word_timed: boolean | null;
    readonly score: number | null;
    readonly scrollable: boolean | null;
    readonly source_format_code: number | null;
    readonly content_type_code: number | null;
  }
  export interface KugouDto_lyric_Lyrics {
    readonly scrollable: boolean;
    readonly offset_ms: number;
    readonly lines: KugouDto_lyric_LyricLine[];
  }
  export interface KugouDto_lyric_LyricLine {
    readonly start_ms: number;
    readonly duration_ms: number;
    readonly text: string;
    readonly words: KugouDto_lyric_LyricWord[];
    readonly translation: string;
    readonly romanization: string;
    readonly romanization_segments: string[];
  }
  export interface KugouDto_lyric_LyricWord {
    readonly start_ms: number;
    readonly duration_ms: number;
    readonly text: string;
  }
  export interface KugouDto_user_verify_UserAuthorization {
    readonly valid: boolean;
    readonly authorization: string;
  }

  export interface KugouDto_domain_SearchSong extends KugouDto_domain_SongSummary {
    readonly audio_id: string | null;
    readonly metadata: KugouDto_discovery_CatalogSongFacts;
    readonly original: boolean | null;
    readonly original_code: number | null;
  }
  export interface KugouDto_domain_ArtistSummary {
    readonly id: string | null;
    readonly name: string;
    readonly avatar_url: string;
    readonly album_count: number | null;
    readonly song_count: number | null;
    readonly fans: number | null;
  }
  export interface KugouDto_domain_PlaylistSummary {
    readonly id: string | null;
    readonly global_id: string;
    readonly title: string;
    readonly creator_id: string;
    readonly creator_name: string;
    readonly cover_url: string;
    readonly song_count: number | null;
    readonly play_count: number | null;
  }
  export interface KugouDto_domain_LyricHit {
    readonly song: KugouDto_domain_SongSummary;
    readonly metadata: KugouDto_discovery_CatalogSongFacts;
    readonly lyric_id: string | null;
    readonly excerpt: string;
  }
  export interface KugouDto_domain_MvSummary {
    readonly id: string | null;
    readonly hash: string;
    readonly title: string;
    readonly artists: KugouDto_domain_ArtistRef[];
    readonly duration_ms: number | null;
    readonly thumbnail_file: string;
  }
  export type KugouDto_domain_SearchResults =
    | { kind: 'songs'; page: KugouDto_domain_Page<KugouDto_domain_SearchSong> }
    | { kind: 'albums'; page: KugouDto_domain_Page<KugouDto_domain_AlbumSummary> }
    | { kind: 'artists'; page: KugouDto_domain_Page<KugouDto_domain_ArtistSummary> }
    | { kind: 'playlists'; page: KugouDto_domain_Page<KugouDto_domain_PlaylistSummary> }
    | { kind: 'lyrics'; page: KugouDto_domain_Page<KugouDto_domain_LyricHit> }
    | { kind: 'mvs'; page: KugouDto_domain_Page<KugouDto_domain_MvSummary> };
  export interface KugouDto_personal_fm_PersonalFmSongs {
    readonly songs: KugouDto_personal_fm_FmSong[];
    readonly batch_mark: string;
    readonly provider_extension: Record<string, JsonValue>;
  }
  export interface KugouDto_personal_fm_FmSong extends KugouDto_discovery_DiscoverySong {
    readonly personal_fm: KugouDto_personal_fm_FmMetadata;
  }
  export interface KugouDto_personal_fm_FmMetadata {
    readonly mark: string;
    readonly similarity: string;
    readonly algorithm: string;
    readonly climax_start_ms: number | null;
    readonly climax_end_ms: number | null;
    readonly climax_duration_ms: number | null;
  }
  export interface KugouDto_listen_together_RoomSession {
    readonly room_id: string;
    readonly owner: boolean | null;
    readonly owner_code: number | null;
    readonly joined_at_seconds: number | null;
    readonly heartbeat_seconds: number | null;
    readonly active_code: number | null;
    readonly capacity: number | null;
    readonly owner_profile: KugouDto_listen_together_Profile | null;
    readonly name: string;
    readonly chat_code: number | null;
    readonly extension: Record<string, JsonValue>;
  }
  export interface KugouDto_listen_together_Profile {
    readonly id: string;
    readonly name: string;
    readonly avatar_url: string | null;
    readonly entered_at_seconds: number | null;
    readonly entered_duration_seconds: number | null;
    readonly extension: Record<string, JsonValue>;
  }
  export interface KugouDto_listen_together_RoomPage {
    readonly items: KugouDto_listen_together_Room[];
    readonly ended: boolean | null;
    readonly ended_code: number | null;
    readonly cursor: number | null;
  }
  export interface KugouDto_listen_together_Room {
    readonly id: string;
    readonly name: string;
    readonly owner: KugouDto_listen_together_Profile;
    readonly member_count: number | null;
    readonly capacity: number | null;
    readonly privacy_code: number | null;
    readonly chat_code: number | null;
    readonly active_code: number | null;
    readonly background_url: string | null;
    readonly channel_id: string;
    readonly channel_name: string;
    readonly current_song: KugouDto_listen_together_RoomSong | null;
    readonly members: KugouDto_listen_together_Profile[];
    readonly extension: Record<string, JsonValue>;
  }
  export interface KugouDto_listen_together_RoomSong {
    readonly song: KugouDto_discovery_DiscoverySong;
    readonly room: KugouDto_listen_together_RoomSongFacts;
  }
  export interface KugouDto_listen_together_RoomSongFacts {
    readonly original_hash: string;
    readonly original_song_id: string;
    readonly can_play_code: number | null;
    readonly genting_code: number | null;
    readonly source_code: number | null;
    readonly anchor_play_code: number | null;
    readonly purchase_code: number | null;
    readonly added_by: KugouDto_listen_together_Profile[];
  }
  export interface KugouDto_listen_together_Members {
    readonly items: KugouDto_listen_together_Profile[];
    readonly total: number | null;
  }
  export interface KugouDto_listen_together_RoomPlaylist {
    readonly items: KugouDto_listen_together_RoomSong[];
    readonly version: string;
    readonly quantity: number | null;
    readonly timestamp_seconds: number | null;
    readonly extension: Record<string, JsonValue>;
  }
  export interface KugouDto_listen_together_RoomPlayback {
    readonly hash: string;
    readonly song_id: string;
    readonly position_ms: number | null;
    readonly pause_code: number | null;
    readonly play_mode_code: number | null;
    readonly timestamp_seconds: number | null;
    readonly version: string;
    readonly songs: KugouDto_listen_together_RoomSong[];
    readonly provider_extension: Record<string, JsonValue>;
  }
  export interface KugouDto_listen_together_SongOrders {
    readonly items: KugouDto_listen_together_SongOrder[];
    readonly total: number | null;
  }
  export interface KugouDto_listen_together_SongOrder {
    readonly song: KugouDto_listen_together_RoomSong;
    readonly requester: KugouDto_listen_together_Profile;
  }
  export interface KugouDto_listen_together_AudioSource {
    readonly urls: string[];
    readonly duration_ms: number | null;
    readonly size_bytes: number | null;
    readonly bit_rate_bps: number | null;
    readonly extension: string;
    readonly volume: number | null;
    readonly volume_gain: number | null;
    readonly volume_peak: number | null;
    readonly status_code: number | null;
    readonly provider_extension: Record<string, JsonValue>;
  }
  export interface KugouDto_listen_together_ChatPage {
    readonly items: KugouDto_listen_together_ChatMessage[];
    readonly unmapped_items: JsonValue[];
    readonly ended: boolean | null;
    readonly ended_code: number | null;
  }
  export interface KugouDto_listen_together_ChatMessage {
    readonly id: string;
    readonly author: KugouDto_listen_together_Profile;
    readonly text: string;
    readonly sent_at_seconds: number | null;
    readonly kind_code: number | null;
    readonly message_type_code: number | null;
    readonly online_code: number | null;
    readonly extension: Record<string, JsonValue>;
  }
  export interface KugouDto_user_batch_union_vipinfo_AuthorProducts {
    readonly user_id: string;
    readonly products: KugouDto_user_batch_union_vipinfo_Membership[];
  }
  export interface KugouDto_user_batch_union_vipinfo_Membership {
    readonly product: string;
    readonly active_code: number | null;
    readonly active: boolean | null;
    readonly year_code: number | null;
    readonly extension: Record<string, JsonValue>;
  }
  export interface KugouDto_domain_SocialPage {
    readonly users: KugouDto_domain_SocialUser[];
    readonly total: number | null;
    readonly next_page: number | null;
    readonly visitor_count: number | null;
    readonly list_revision: number | null;
    readonly unmapped_entries: JsonValue | null;
  }
  export interface KugouDto_domain_SocialUser {
    readonly key: string;
    readonly user_id: string;
    readonly artist_id: string | null;
    readonly nickname: string;
    readonly avatar_url: string;
    readonly description: string;
    readonly grade: number | null;
    readonly following: boolean | null;
    readonly mutual: boolean | null;
    readonly visited_at_seconds: number | null;
    readonly identity: KugouDto_domain_ProfileIdentity;
    readonly membership: KugouDto_domain_SocialMembership;
    readonly identity_facts: KugouDto_domain_SocialIdentityFacts;
  }
  export interface KugouDto_domain_SocialMembership {
    readonly super_active: boolean;
    readonly deluxe_active: boolean;
  }
  export interface KugouDto_domain_SocialIdentityFacts {
    readonly talent_bits: number | null;
    readonly star_code: number | null;
    readonly singer_status: number | null;
    readonly vip_type: number | null;
    readonly user_type: number | null;
    readonly friend_code: number | null;
    readonly identity_type: number | null;
  }
  export interface KugouDto_login_device_kick_Acknowledgement {
    readonly removed: boolean;
  }
  export interface KugouDto_user_update_Acknowledgement {
    readonly updated: boolean;
  }
  export interface KugouDto_user_preference_update_Acknowledgement {
    readonly updated: boolean;
  }
  export interface KugouDto_blacklist_list_BlacklistPage {
    readonly response_label: JsonValue | null;
    readonly source: JsonValue | null;
    readonly provider_fields: Record<string, JsonValue>;
    readonly label: KugouDto_blacklist_list_Label;
    readonly page: number | null;
    readonly page_size: number | null;
    readonly total: number | null;
    readonly items: KugouDto_blacklist_list_Entry[];
  }

  export type KugouDto_blacklist_list_Label = 'song' | 'singer';
  export interface KugouDto_blacklist_list_Entry {
    readonly key: string | null;
    readonly name: string | null;
    readonly mix_song_id: string | null;
    readonly created_at: string | null;
    readonly source_record: JsonValue;
  }
  export interface KugouDto_blacklist_Acknowledgement {
    readonly updated: boolean;
  }
  export interface KugouDto_user_cloud_del_CloudDeleteResult {
    readonly counters: KugouDto_user_cloud_CloudCounters;
  }
  export interface KugouDto_import_playlist_ImportResult {
    readonly task: KugouDto_import_playlist_ImportTask;
    readonly missed_tracks: KugouDto_import_playlist_MissedTrack[];
    readonly page: number;
    readonly page_size: number;
  }
  export interface KugouDto_import_playlist_MissedTrack {
    readonly title: string;
    readonly artist: string;
    readonly album: string;
    readonly reason: string;
  }
  export interface KugouDto_playlist_detail_PlaylistDetail {
    readonly global_id: string;
    readonly public_id: string | null;
    readonly title: string;
    readonly description: string;
    readonly cover_url: string;
    readonly creator_id: string | null;
    readonly creator_list_id: string | null;
    readonly creator_name: string;
    readonly creator_avatar_url: string;
    readonly song_count: number | null;
    readonly revision: number | null;
    readonly published_at: string;
    readonly collection_count: number | null;
    readonly private: boolean | null;
    readonly private_code: number | null;
    readonly published: boolean | null;
    readonly publication_code: number | null;
    readonly tags: string | null;
    readonly created_at_seconds: number | null;
    readonly updated_at_seconds: number | null;
    readonly creator_global_id: string | null;
    readonly source_code: number | null;
    readonly custom_cover: boolean | null;
    readonly custom_cover_code: number | null;
    readonly default_kind: number | null;
    readonly music_tags: KugouDto_discovery_SongTag[] | null;
  }
  export interface KugouDto_playlist_track_all_PublicPlaylistTrack {
    readonly song: KugouDto_domain_SongSummary;
    readonly metadata: KugouDto_playlist_song_Metadata;
    readonly file_id: string | null;
    readonly sort_index: number | null;
    readonly collected_at_seconds: number | null;
  }
  export interface KugouDto_playlist_song_Metadata {
    readonly audio_id: string | null;
    readonly album_details_id: string | null;
    readonly language: string | null;
    readonly published_at: string | null;
    readonly source_file_name: string;
    readonly filename_artist_name: string | null;
    readonly title_suffix: string | null;
    readonly album_audio_remark: string | null;
    readonly old_copyright_code: number | null;
    readonly payment_type: number | null;
    readonly failure_code: number | null;
    readonly publication_code: number | null;
    readonly has_accompaniment: boolean | null;
    readonly rights: KugouDto_discovery_CatalogRights | null;
    readonly resources: KugouDto_discovery_AudioResource[];
    readonly videos: KugouDto_discovery_VideoReference[];
    readonly artists: KugouDto_discovery_ArtistDetail[];
    readonly genre_map: Record<string, number | null> | null;
    readonly related_resources: KugouDto_playlist_song_RelatedResource[];
    readonly downloads: KugouDto_playlist_song_Download[];
    readonly accompaniment_code: number | null;
  }
  export interface KugouDto_playlist_song_RelatedResource {
    readonly hash: string;
    readonly size: number | null;
    readonly bitrate: number | null;
    readonly privilege: number | null;
    readonly level: number | null;
  }
  export interface KugouDto_playlist_song_Download {
    readonly hash: string;
    readonly status: number | null;
    readonly pay_type: number | null;
    readonly fail_process: number | null;
  }
  export interface KugouDto_playlist_track_all_new_CloudPlaylistTracks {
    readonly page: KugouDto_domain_Page<KugouDto_playlist_track_all_new_CloudPlaylistTrack>;
    readonly user_id: string;
    readonly cloud_list_id: string;
    readonly revision: number;
  }
  export interface KugouDto_playlist_track_all_new_CloudPlaylistTrack {
    readonly song: KugouDto_domain_SongSummary;
    readonly metadata: KugouDto_playlist_song_Metadata;
    readonly file_id: string | null;
    readonly sort_index: number | null;
    readonly file_sort_index: number | null;
    readonly collected_at_seconds: number | null;
  }
  export interface KugouDto_krm_audio_SongPresentation {
    readonly id: string;
    readonly title: string;
    readonly album_id: string;
    readonly album_title: string;
    readonly cover_url: string;
    readonly artists: KugouDto_discovery_ArtistDetail[];
  }
  export interface KugouDto_playlist_sort_LibraryOrderChange {
    readonly user_id: string;
    readonly previous_total_revision: number;
    readonly total_revision: number;
    readonly playlist_count: number | null;
    readonly positions: KugouDto_playlist_sort_LibraryPosition[];
  }
  export interface KugouDto_playlist_sort_LibraryPosition {
    readonly cloud_list_id: string;
    readonly kind: KugouDto_playlist_sort_Kind | null;
    readonly kind_code: number;
    readonly position: number;
  }

  export type KugouDto_playlist_sort_Kind = 'owned' | 'collected';
  export interface KugouDto_domain_CloudTrackChange {
    readonly user_id: string;
    readonly cloud_list_id: string;
    readonly previous_revision: number;
    readonly revision: number;
    readonly song_count: number | null;
    readonly outcomes: KugouDto_domain_TrackWriteOutcome[] | null;
    readonly replaced_file_ids: (number | null)[] | null;
  }
  export interface KugouDto_domain_TrackWriteOutcome {
    readonly position: number | null;
    readonly file_id: string;
    readonly song_id: string | null;
    readonly resource_code: number;
  }
  export interface KugouDto_effects_brand_Brand {
    readonly id: string;
    readonly name: string;
    readonly icon_url: string;
    readonly model_count: number | null;
  }
  export interface KugouDto_song_url_auth_PlaybackSource {
    readonly hash: string;
    readonly urls: string[];
    readonly backup_urls: string[];
    readonly file_size_bytes: number | null;
    readonly bit_rate_bps: number | null;
    readonly duration_ms: number | null;
    readonly standard_duration_ms: number | null;
    readonly extension: string;
    readonly file_name: string;
    readonly file_head: number | null;
    readonly loudness: number | null;
    readonly peak: number | null;
    readonly gain: number | null;
  }
  export interface KugouDto_privilege_lite_ResourcePrivileges {
    readonly id: string | null;
    readonly album_id: string;
    readonly song_id: string | null;
    readonly hash: string;
    readonly display_name: string;
    readonly artist_text: string;
    readonly album_title: string | null;
    readonly primary: KugouDto_privilege_lite_QualityVariant;
    readonly variants: KugouDto_privilege_lite_QualityVariant[];
    readonly ogg_standard: KugouDto_privilege_lite_EncodedFile | null;
    readonly ogg_high: KugouDto_privilege_lite_EncodedFile | null;
    readonly preview: KugouDto_privilege_lite_PreviewRange | null;
    readonly quality_map: KugouDto_privilege_lite_QualityMap | null;
    readonly resource_error: number | null;
    readonly resource_message: string;
    readonly language: string;
    readonly presentation_extension: Record<string, JsonValue>;
  }
  export interface KugouDto_privilege_lite_QualityVariant {
    readonly message: string;
    readonly error_code: number | null;
    readonly hash: string;
    readonly quality: string;
    readonly level: number | null;
    readonly privilege: number | null;
    readonly service_status: number | null;
    readonly failure_code: number | null;
    readonly payment_type: number | null;
    readonly price_units: number | null;
    readonly duration_ms: number | null;
    readonly size_bytes: number | null;
    readonly bit_rate_bps: number | null;
    readonly extension: string;
    readonly cover_url: string;
  }
  export interface KugouDto_privilege_lite_EncodedFile {
    readonly hash: string | null;
    readonly size_bytes: number | null;
  }
  export interface KugouDto_user_cloud_url_CloudSource {
    readonly urls: string[];
    readonly backup_urls: string[];
    readonly file_size_bytes: number | null;
    readonly extension: string;
    readonly hash: string;
    readonly provider_extension: Record<string, JsonValue>;
  }
  export interface KugouAudioImageResource {
    readonly hash: string;
    readonly audioId?: string;
    readonly albumAudioId?: string;
    readonly filename?: string;
  }
  export interface KugouArtistPortrait {
    readonly id: string | null;
    readonly file_hash: string | null;
    readonly url: string | null;
    readonly filename: string | null;
    readonly publish_time: string | null;
    readonly source: number | null;
  }
  export interface KugouArtistImages {
    readonly artist_id: string | null;
    readonly name: string | null;
    readonly publish_status: number | null;
    readonly resource_hash: string | null;
    readonly avatar: string | null;
    readonly avatar_url: string | null;
    readonly audio_publish_date: string | null;
    readonly images: Readonly<Record<string, readonly KugouArtistPortrait[]>>;
  }
  export interface KugouMethods {
    audioImages: {
      arguments: { resources: readonly KugouAudioImageResource[]; count?: number };
      result: KugouArtistImages[][];
    };
    addPlaylistTracks: {
      arguments: { id: string; tracks: readonly KugouPlaylistTrackInput[] };
      result: KugouDto_domain_CloudTrackChange;
    };
    albumDetail: {
      arguments: { albumId: string };
      result: KugouDto_album_detail_AlbumDetail | null;
    };
    albumDynamicCover: {
      arguments: { albumAudioId: string; albumId: string };
      result: KugouDto_album_dycover_DynamicCover | null;
    };
    albumSongs: {
      arguments: { albumId: string; page?: number; pageSize?: number };
      result: KugouDto_album_songs_AlbumTracks;
    };
    artistAlbums: {
      arguments: { artistId: string; page?: number; pageSize?: number; sort?: string };
      result: KugouDto_domain_Page<KugouDto_domain_AlbumSummary>;
    };
    artistDetail: {
      arguments: { artistId: string };
      result: KugouDto_artist_detail_ArtistDetail | null;
    };
    artistDirectory: {
      arguments: { sex: number; category: number; musician: number };
      result: KugouDto_artist_lists_Directory;
    };
    artistSongs: {
      arguments: { artistId: string; page?: number; pageSize?: number; sort?: string };
      result: KugouDto_domain_Page<KugouDto_artist_audios_new_ArtistSong>;
    };
    audioEffects: {
      arguments: {
        category?: 'artist' | 'headphoneBrands' | 'headphoneModels' | 'market';
        page?: number;
        pageSize?: number;
        sort?: number;
        brand?: number;
      };
      result:
        | KugouDto_domain_Page<KugouDto_audio_effect_Effect>
        | KugouDto_domain_Page<KugouDto_effects_brand_Brand>;
    };
    cloudMatch: { arguments: { hash: string }; result: KugouDto_user_cloud_match_Matches };
    cloudPlaylistTracks: {
      arguments: { id: string; page?: number; pageSize?: number };
      result: KugouDto_playlist_track_all_new_CloudPlaylistTracks;
    };
    cloudSource: {
      arguments: { hash: string; songId?: string; audioId?: string; name?: string };
      result: KugouDto_user_cloud_url_CloudSource;
    };
    collectPlaylist: {
      arguments: { target: KugouCollectionTarget };
      result: KugouDto_domain_LibraryPlaylistChange;
    };
    collectVideo: {
      arguments: { videoId: string; collect: boolean };
      result: KugouDto_mv_collect_Ack;
    };
    commentAuthorProducts: {
      arguments: { userIds: readonly string[] };
      result: KugouDto_user_batch_union_vipinfo_AuthorProducts[];
    };
    commentCount: { arguments: { hash: string }; result: number | null };
    comments: { arguments: { query: KugouCommentQuery }; result: KugouDto_comment_Page };
    commonHeadphoneEffect: { arguments: {}; result: KugouDto_audio_effect_Effect | null };
    contentBlacklist: {
      arguments: { kind?: 'song' | 'singer'; page?: number; pageSize?: number };
      result: KugouDto_blacklist_list_BlacklistPage;
    };
    createPlaylist: {
      arguments: { title: string; isPrivate: boolean };
      result: KugouDto_domain_LibraryPlaylistChange;
    };
    dailyRecommendations: {
      arguments: {};
      result: KugouDto_everyday_recommend_DailyRecommendations;
    };
    deleteComment: {
      arguments: { write: KugouCommentWrite };
      result: KugouDto_comment_write_Acknowledgement;
    };
    deletePlaylist: { arguments: { id: string }; result: KugouDto_domain_LibraryPlaylistChange };
    discoverRecommendations: {
      arguments: { pageSize?: number };
      result: KugouDto_home_discover_DiscoverRecommendations;
    };
    editContentBlacklist: {
      arguments: {
        kind?: 'song' | 'singer';
        key: string;
        name: string;
        mixSongId: string;
        remove?: boolean;
      };
      result: KugouDto_blacklist_Acknowledgement;
    };
    editorPlaylists: { arguments: {}; result: KugouDto_top_playlist_PlaylistCard[] };
    favoriteCount: { arguments: { mixSongId: string }; result: KugouDto_favorite_count_Count[] };
    followArtist: { arguments: { id: string; following: boolean }; result: JsonValue };
    followUser: {
      arguments: { id: string; following: boolean };
      result: KugouDto_user_follow_add_FollowChange;
    };
    freeListenSongs: { arguments: {}; result: KugouDto_ai_recommend_song_FreeListenSongs };
    importPlaylistLink: {
      arguments: { text: string };
      result: KugouDto_import_playlist_ImportTask;
    };
    importPlaylistScreenshot: {
      arguments: { taskSerial: string; id: string; title: string };
      result: KugouDto_import_playlist_ImportTask;
    };
    kickLoginDevice: {
      arguments: { target: KugouLoginDeviceTarget };
      result: KugouDto_login_device_kick_Acknowledgement;
    };
    listenTogetherChat: {
      arguments: { request: KugouListenChatRequest };
      result: KugouDto_listen_together_ChatPage;
    };
    listenTogetherMusic: {
      arguments: { request: KugouListenMusicRequest };
      result:
        | KugouDto_listen_together_RoomPage
        | KugouDto_listen_together_Room
        | KugouDto_listen_together_Members
        | KugouDto_listen_together_RoomPlaylist
        | KugouDto_listen_together_RoomPlayback
        | KugouDto_listen_together_SongOrders
        | KugouDto_listen_together_AudioSource;
    };
    listenTogetherRoom: {
      arguments: { request: KugouListenRoomRequest };
      result: KugouDto_listen_together_RoomSession;
    };
    listeningPreferences: { arguments: {}; result: KugouDto_user_preference_Preferences };
    loginDevices: { arguments: {}; result: KugouDto_domain_LoginDevice[] };
    lyric: { arguments: { id: string; accessKey: string }; result: KugouDto_lyric_Lyrics };
    lyricCandidates: {
      arguments: { hash: string; songId: string; durationMs: number; allCandidates?: boolean };
      result: KugouDto_search_lyric_Candidate[];
    };
    lyricCandidatesByKeywords: {
      arguments: { keywords: string; durationMs: number; allCandidates?: boolean };
      result: KugouDto_search_lyric_Candidate[];
    };
    newAlbumCatalog: { arguments: {}; result: KugouDto_top_album_Albums };
    newSongCatalog: { arguments: {}; result: KugouDto_top_song_NewSongs };
    personalFm: {
      arguments: { request: KugouFmRequest };
      result: KugouDto_personal_fm_PersonalFmSongs;
    };
    playbackSource: {
      arguments: {
        hash: string;
        albumId: string;
        songId: string;
        quality?:
          | 'standard'
          | 'higher'
          | 'flac'
          | 'hiRes'
          | 'viperTape'
          | 'viperClear'
          | 'viperAtmos'
          | 'automatic';
        authorization?: string;
        effect?:
          'none' | 'piano' | 'vocal' | 'accompaniment' | 'subwoofer' | 'ancient' | 'surnay' | 'dj';
        originPage?: string;
      };
      result: KugouDto_song_url_auth_PlaybackSource;
    };
    playlistCategories: { arguments: {}; result: KugouDto_playlist_tags_Category[] };
    playlistDetails: {
      arguments: { ids: readonly string[] };
      result: KugouDto_playlist_detail_PlaylistDetail[];
    };
    playlistImportResult: {
      arguments: { id: string; page?: number; pageSize?: number };
      result: KugouDto_import_playlist_ImportResult;
    };
    playlistImportStatus: {
      arguments: { taskId: string };
      result: KugouDto_import_playlist_ImportTask[];
    };
    publicPlaylistTracks: {
      arguments: { id: string; page?: number; pageSize?: number };
      result: KugouDto_domain_Page<KugouDto_playlist_track_all_PublicPlaylistTrack>;
    };
    purchasedAlbums: {
      arguments: { page?: number; pageSize?: number };
      result: KugouDto_domain_Page<JsonValue>;
    };
    purchasedSongs: {
      arguments: { page?: number; pageSize?: number };
      result: KugouDto_domain_Page<JsonValue>;
    };
    rankCatalog: { arguments: {}; result: KugouDto_rank_catalog_Rank[] };
    rankSongs: { arguments: { rankId: string }; result: KugouDto_rank_audio_RankSongs };
    recommendedPlaylists: {
      arguments: { categoryId: string };
      result: KugouDto_top_playlist_PlaylistCard[];
    };
    recommendedRanks: { arguments: {}; result: KugouDto_rank_catalog_Rank[] };
    removePlaylistTracks: {
      arguments: { id: string; files: readonly string[] };
      result: KugouDto_domain_CloudTrackChange;
    };
    replyComment: {
      arguments: { write: KugouCommentWrite };
      result: KugouDto_comment_write_Acknowledgement;
    };
    search: {
      arguments: {
        kind?: 'song' | 'album' | 'artist' | 'playlist' | 'lyric' | 'mv';
        keyword: string;
        page?: number;
        pageSize?: number;
      };
      result: KugouDto_domain_SearchResults;
    };
    searchDefault: { arguments: {}; result: KugouDto_search_default_DefaultSearch };
    searchHot: { arguments: {}; result: KugouDto_domain_HotSearchGroup[] };
    searchSuggest: { arguments: { keyword: string }; result: KugouDto_search_suggest_Suggestions };
    sendComment: {
      arguments: { write: KugouCommentWrite };
      result: KugouDto_comment_write_Acknowledgement;
    };
    sendSocialMessage: {
      arguments: { target: number; tag: string; text: string; nickname: string };
      result: KugouDto_user_follow_chat_Data;
    };
    sendSongBarrage: {
      arguments: { hash: string; name: string; content: string };
      result: KugouDto_comment_write_Acknowledgement;
    };
    sendVideoBarrage: {
      arguments: { hash: string; name: string; content: string };
      result: KugouDto_comment_write_Acknowledgement;
    };
    socialMessages: {
      arguments: { target: number; tag?: string };
      result: KugouDto_user_follow_message_History;
    };
    socialUsers: {
      arguments: { list?: 'follow' | 'friends' | 'fans' | 'visitors' };
      result: KugouDto_domain_SocialPage;
    };
    songBarrage: { arguments: { hash: string; pageSize?: number }; result: KugouDto_comment_Page };
    songClimax: { arguments: { hash: string }; result: KugouDto_song_climax_ClimaxSegment[] };
    songMetadata: {
      arguments: { ids: readonly string[] };
      result: KugouDto_krm_audio_SongPresentation[];
    };
    songMv: { arguments: { mixSongId: string }; result: KugouDto_video_Video[] };
    songPrivileges: {
      arguments: { resources: readonly KugouPrivilegeResource[] };
      result: KugouDto_privilege_lite_ResourcePrivileges[];
    };
    songRanking: {
      arguments: { mixSongId: string; details?: boolean };
      result: KugouDto_song_ranking_Ranking | KugouDto_song_ranking_filter_Ranking;
    };
    sortPlaylistTracks: {
      arguments: { id: string; revision: number; positions: readonly KugouPlaylistTrackPosition[] };
      result: KugouDto_domain_CloudTrackChange;
    };
    sortPlaylists: {
      arguments: { totalRevision: number; positions: readonly KugouPlaylistPosition[] };
      result: KugouDto_playlist_sort_LibraryOrderChange;
    };
    styleRecommendations: {
      arguments: { tagIds?: readonly string[] };
      result: KugouDto_everyday_style_recommend_StyleRecommendations;
    };
    submitPlaylistImportImage: {
      arguments: { taskSerial: string; image: ArrayBuffer };
      result: { readonly uploaded: true };
    };
    updateListeningPreferences: {
      arguments: { patch: KugouPreferencePatch };
      result: KugouDto_user_preference_update_Acknowledgement;
    };
    updatePlaylist: {
      arguments: { update: KugouPlaylistUpdate };
      result: KugouDto_domain_LibraryPlaylistChange;
    };
    uploadUserAvatar: {
      arguments: { image: ArrayBuffer };
      result: { readonly file_name: string };
    };
    updateUserAvatar: {
      arguments: { fileName: string };
      result: KugouDto_user_update_avatar_AvatarUpdate;
    };
    updateUserProfile: {
      arguments: { patch: KugouProfilePatch };
      result: KugouDto_user_update_Acknowledgement;
    };
    uploadPlaylistCover: {
      arguments: { png: ArrayBuffer };
      result: KugouDto_playlist_pic_upload_UploadedCover;
    };
    userCloud: {
      arguments: { page?: number; pageSize?: number };
      result: KugouDto_user_cloud_CloudFilesPage;
    };
    userCloudDelete: {
      arguments: { targets: readonly KugouCloudDeleteTarget[] };
      result: KugouDto_user_cloud_del_CloudDeleteResult;
    };
    userDetail: { arguments: {}; result: KugouDto_domain_Profile };
    userGradeInfo: {
      arguments: { userId?: string; automaticVerification?: boolean };
      result: KugouDto_user_grade_info_ListeningGrade;
    };
    userInfo: { arguments: {}; result: KugouDto_user_info_UserIdentity };
    userPlaylists: {
      arguments: { page?: number; pageSize?: number };
      result: KugouDto_user_playlist_UserPlaylists;
    };
    userVerify: { arguments: {}; result: KugouDto_user_verify_UserAuthorization };
    userVideoCollect: {
      arguments: { page?: number; pageSize?: number };
      result: KugouDto_user_video_collect_VideoPage;
    };
    userVipDetail: { arguments: {}; result: KugouDto_user_vip_detail_Memberships };
    videoBarrage: { arguments: { hash: string; pageSize?: number }; result: KugouDto_comment_Page };
    videoDetail: { arguments: { videoId: string }; result: KugouDto_video_Video[] };
    videoPrivilege: { arguments: { hash: string }; result: KugouDto_video_privilege_Row[] };
    videoUrl: { arguments: { hash: string }; result: KugouDto_video_url_VideoUrl | null };
  }
  export interface EchoPluginKugou {
    readonly account: Readonly<{ userId: string; loggedIn: boolean; revision: string }>;
    readonly accountChanged: QtSignal;
    request(
      method: 'addPlaylistTracks',
      arguments: { id: string; tracks: readonly KugouPlaylistTrackInput[] },
    ): EchoPluginOperation<KugouMethods['addPlaylistTracks']['result']>;
    request(
      method: 'albumDetail',
      arguments: { albumId: string },
    ): EchoPluginOperation<KugouMethods['albumDetail']['result']>;
    request(
      method: 'albumDynamicCover',
      arguments: { albumAudioId: string; albumId: string },
    ): EchoPluginOperation<KugouMethods['albumDynamicCover']['result']>;
    request(
      method: 'albumSongs',
      arguments: { albumId: string; page?: number; pageSize?: number },
    ): EchoPluginOperation<KugouMethods['albumSongs']['result']>;
    request(
      method: 'artistAlbums',
      arguments: { artistId: string; page?: number; pageSize?: number; sort?: string },
    ): EchoPluginOperation<KugouMethods['artistAlbums']['result']>;
    request(
      method: 'artistDetail',
      arguments: { artistId: string },
    ): EchoPluginOperation<KugouMethods['artistDetail']['result']>;
    request(
      method: 'artistDirectory',
      arguments: { sex: number; category: number; musician: number },
    ): EchoPluginOperation<KugouMethods['artistDirectory']['result']>;
    request(
      method: 'artistSongs',
      arguments: { artistId: string; page?: number; pageSize?: number; sort?: string },
    ): EchoPluginOperation<KugouMethods['artistSongs']['result']>;
    request(
      method: 'audioEffects',
      arguments: {
        category?: 'artist' | 'headphoneBrands' | 'headphoneModels' | 'market';
        page?: number;
        pageSize?: number;
        sort?: number;
        brand?: number;
      },
    ): EchoPluginOperation<KugouMethods['audioEffects']['result']>;
    request(
      method: 'cloudMatch',
      arguments: { hash: string },
    ): EchoPluginOperation<KugouMethods['cloudMatch']['result']>;
    request(
      method: 'cloudPlaylistTracks',
      arguments: { id: string; page?: number; pageSize?: number },
    ): EchoPluginOperation<KugouMethods['cloudPlaylistTracks']['result']>;
    request(
      method: 'cloudSource',
      arguments: { hash: string; songId?: string; audioId?: string; name?: string },
    ): EchoPluginOperation<KugouMethods['cloudSource']['result']>;
    request(
      method: 'collectPlaylist',
      arguments: { target: KugouCollectionTarget },
    ): EchoPluginOperation<KugouMethods['collectPlaylist']['result']>;
    request(
      method: 'collectVideo',
      arguments: { videoId: string; collect: boolean },
    ): EchoPluginOperation<KugouMethods['collectVideo']['result']>;
    request(
      method: 'commentAuthorProducts',
      arguments: { userIds: readonly string[] },
    ): EchoPluginOperation<KugouMethods['commentAuthorProducts']['result']>;
    request(
      method: 'commentCount',
      arguments: { hash: string },
    ): EchoPluginOperation<KugouMethods['commentCount']['result']>;
    request(
      method: 'comments',
      arguments: { query: KugouCommentQuery },
    ): EchoPluginOperation<KugouMethods['comments']['result']>;
    request(
      method: 'commonHeadphoneEffect',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['commonHeadphoneEffect']['result']>;
    request(
      method: 'contentBlacklist',
      arguments: { kind?: 'song' | 'singer'; page?: number; pageSize?: number },
    ): EchoPluginOperation<KugouMethods['contentBlacklist']['result']>;
    request(
      method: 'createPlaylist',
      arguments: { title: string; isPrivate: boolean },
    ): EchoPluginOperation<KugouMethods['createPlaylist']['result']>;
    request(
      method: 'dailyRecommendations',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['dailyRecommendations']['result']>;
    request(
      method: 'deleteComment',
      arguments: { write: KugouCommentWrite },
    ): EchoPluginOperation<KugouMethods['deleteComment']['result']>;
    request(
      method: 'deletePlaylist',
      arguments: { id: string },
    ): EchoPluginOperation<KugouMethods['deletePlaylist']['result']>;
    request(
      method: 'discoverRecommendations',
      arguments: { pageSize?: number },
    ): EchoPluginOperation<KugouMethods['discoverRecommendations']['result']>;
    request(
      method: 'editContentBlacklist',
      arguments: {
        kind?: 'song' | 'singer';
        key: string;
        name: string;
        mixSongId: string;
        remove?: boolean;
      },
    ): EchoPluginOperation<KugouMethods['editContentBlacklist']['result']>;
    request(
      method: 'editorPlaylists',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['editorPlaylists']['result']>;
    request(
      method: 'favoriteCount',
      arguments: { mixSongId: string },
    ): EchoPluginOperation<KugouMethods['favoriteCount']['result']>;
    request(
      method: 'followArtist',
      arguments: { id: string; following: boolean },
    ): EchoPluginOperation<KugouMethods['followArtist']['result']>;
    request(
      method: 'followUser',
      arguments: { id: string; following: boolean },
    ): EchoPluginOperation<KugouMethods['followUser']['result']>;
    request(
      method: 'freeListenSongs',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['freeListenSongs']['result']>;
    request(
      method: 'importPlaylistLink',
      arguments: { text: string },
    ): EchoPluginOperation<KugouMethods['importPlaylistLink']['result']>;
    request(
      method: 'importPlaylistScreenshot',
      arguments: { taskSerial: string; id: string; title: string },
    ): EchoPluginOperation<KugouMethods['importPlaylistScreenshot']['result']>;
    request(
      method: 'kickLoginDevice',
      arguments: { target: KugouLoginDeviceTarget },
    ): EchoPluginOperation<KugouMethods['kickLoginDevice']['result']>;
    request(
      method: 'listenTogetherChat',
      arguments: { request: KugouListenChatRequest },
    ): EchoPluginOperation<KugouMethods['listenTogetherChat']['result']>;
    request(
      method: 'listenTogetherMusic',
      arguments: { request: KugouListenMusicRequest },
    ): EchoPluginOperation<KugouMethods['listenTogetherMusic']['result']>;
    request(
      method: 'listenTogetherRoom',
      arguments: { request: KugouListenRoomRequest },
    ): EchoPluginOperation<KugouMethods['listenTogetherRoom']['result']>;
    request(
      method: 'listeningPreferences',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['listeningPreferences']['result']>;
    request(
      method: 'loginDevices',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['loginDevices']['result']>;
    request(
      method: 'lyric',
      arguments: { id: string; accessKey: string },
    ): EchoPluginOperation<KugouMethods['lyric']['result']>;
    request(
      method: 'lyricCandidates',
      arguments: { hash: string; songId: string; durationMs: number; allCandidates?: boolean },
    ): EchoPluginOperation<KugouMethods['lyricCandidates']['result']>;
    request(
      method: 'lyricCandidatesByKeywords',
      arguments: { keywords: string; durationMs: number; allCandidates?: boolean },
    ): EchoPluginOperation<KugouMethods['lyricCandidatesByKeywords']['result']>;
    request(
      method: 'newAlbumCatalog',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['newAlbumCatalog']['result']>;
    request(
      method: 'newSongCatalog',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['newSongCatalog']['result']>;
    request(
      method: 'personalFm',
      arguments: { request: KugouFmRequest },
    ): EchoPluginOperation<KugouMethods['personalFm']['result']>;
    request(
      method: 'playbackSource',
      arguments: {
        hash: string;
        albumId: string;
        songId: string;
        quality?:
          | 'standard'
          | 'higher'
          | 'flac'
          | 'hiRes'
          | 'viperTape'
          | 'viperClear'
          | 'viperAtmos'
          | 'automatic';
        authorization?: string;
        effect?:
          'none' | 'piano' | 'vocal' | 'accompaniment' | 'subwoofer' | 'ancient' | 'surnay' | 'dj';
        originPage?: string;
      },
    ): EchoPluginOperation<KugouMethods['playbackSource']['result']>;
    request(
      method: 'playlistCategories',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['playlistCategories']['result']>;
    request(
      method: 'playlistDetails',
      arguments: { ids: readonly string[] },
    ): EchoPluginOperation<KugouMethods['playlistDetails']['result']>;
    request(
      method: 'playlistImportResult',
      arguments: { id: string; page?: number; pageSize?: number },
    ): EchoPluginOperation<KugouMethods['playlistImportResult']['result']>;
    request(
      method: 'playlistImportStatus',
      arguments: { taskId: string },
    ): EchoPluginOperation<KugouMethods['playlistImportStatus']['result']>;
    request(
      method: 'publicPlaylistTracks',
      arguments: { id: string; page?: number; pageSize?: number },
    ): EchoPluginOperation<KugouMethods['publicPlaylistTracks']['result']>;
    request(
      method: 'purchasedAlbums',
      arguments: { page?: number; pageSize?: number },
    ): EchoPluginOperation<KugouMethods['purchasedAlbums']['result']>;
    request(
      method: 'purchasedSongs',
      arguments: { page?: number; pageSize?: number },
    ): EchoPluginOperation<KugouMethods['purchasedSongs']['result']>;
    request(
      method: 'rankCatalog',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['rankCatalog']['result']>;
    request(
      method: 'rankSongs',
      arguments: { rankId: string },
    ): EchoPluginOperation<KugouMethods['rankSongs']['result']>;
    request(
      method: 'recommendedPlaylists',
      arguments: { categoryId: string },
    ): EchoPluginOperation<KugouMethods['recommendedPlaylists']['result']>;
    request(
      method: 'recommendedRanks',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['recommendedRanks']['result']>;
    request(
      method: 'removePlaylistTracks',
      arguments: { id: string; files: readonly string[] },
    ): EchoPluginOperation<KugouMethods['removePlaylistTracks']['result']>;
    request(
      method: 'replyComment',
      arguments: { write: KugouCommentWrite },
    ): EchoPluginOperation<KugouMethods['replyComment']['result']>;
    request(
      method: 'search',
      arguments: {
        kind?: 'song' | 'album' | 'artist' | 'playlist' | 'lyric' | 'mv';
        keyword: string;
        page?: number;
        pageSize?: number;
      },
    ): EchoPluginOperation<KugouMethods['search']['result']>;
    request(
      method: 'searchDefault',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['searchDefault']['result']>;
    request(
      method: 'searchHot',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['searchHot']['result']>;
    request(
      method: 'searchSuggest',
      arguments: { keyword: string },
    ): EchoPluginOperation<KugouMethods['searchSuggest']['result']>;
    request(
      method: 'sendComment',
      arguments: { write: KugouCommentWrite },
    ): EchoPluginOperation<KugouMethods['sendComment']['result']>;
    request(
      method: 'sendSocialMessage',
      arguments: { target: number; tag: string; text: string; nickname: string },
    ): EchoPluginOperation<KugouMethods['sendSocialMessage']['result']>;
    request(
      method: 'sendSongBarrage',
      arguments: { hash: string; name: string; content: string },
    ): EchoPluginOperation<KugouMethods['sendSongBarrage']['result']>;
    request(
      method: 'sendVideoBarrage',
      arguments: { hash: string; name: string; content: string },
    ): EchoPluginOperation<KugouMethods['sendVideoBarrage']['result']>;
    request(
      method: 'socialMessages',
      arguments: { target: number; tag?: string },
    ): EchoPluginOperation<KugouMethods['socialMessages']['result']>;
    request(
      method: 'socialUsers',
      arguments: { list?: 'follow' | 'friends' | 'fans' | 'visitors' },
    ): EchoPluginOperation<KugouMethods['socialUsers']['result']>;
    request(
      method: 'songBarrage',
      arguments: { hash: string; pageSize?: number },
    ): EchoPluginOperation<KugouMethods['songBarrage']['result']>;
    request(
      method: 'songClimax',
      arguments: { hash: string },
    ): EchoPluginOperation<KugouMethods['songClimax']['result']>;
    request(
      method: 'audioImages',
      arguments: KugouMethods['audioImages']['arguments'],
    ): EchoPluginOperation<KugouMethods['audioImages']['result']>;
    request(
      method: 'songMetadata',
      arguments: { ids: readonly string[] },
    ): EchoPluginOperation<KugouMethods['songMetadata']['result']>;
    request(
      method: 'songMv',
      arguments: { mixSongId: string },
    ): EchoPluginOperation<KugouMethods['songMv']['result']>;
    request(
      method: 'songPrivileges',
      arguments: { resources: readonly KugouPrivilegeResource[] },
    ): EchoPluginOperation<KugouMethods['songPrivileges']['result']>;
    request(
      method: 'songRanking',
      arguments: { mixSongId: string; details?: boolean },
    ): EchoPluginOperation<KugouMethods['songRanking']['result']>;
    request(
      method: 'sortPlaylistTracks',
      arguments: { id: string; revision: number; positions: readonly KugouPlaylistTrackPosition[] },
    ): EchoPluginOperation<KugouMethods['sortPlaylistTracks']['result']>;
    request(
      method: 'sortPlaylists',
      arguments: { totalRevision: number; positions: readonly KugouPlaylistPosition[] },
    ): EchoPluginOperation<KugouMethods['sortPlaylists']['result']>;
    request(
      method: 'styleRecommendations',
      arguments: { tagIds?: readonly string[] },
    ): EchoPluginOperation<KugouMethods['styleRecommendations']['result']>;
    request(
      method: 'submitPlaylistImportImage',
      arguments: { taskSerial: string; image: ArrayBuffer },
    ): EchoPluginOperation<KugouMethods['submitPlaylistImportImage']['result']>;
    request(
      method: 'updateListeningPreferences',
      arguments: { patch: KugouPreferencePatch },
    ): EchoPluginOperation<KugouMethods['updateListeningPreferences']['result']>;
    request(
      method: 'updatePlaylist',
      arguments: { update: KugouPlaylistUpdate },
    ): EchoPluginOperation<KugouMethods['updatePlaylist']['result']>;
    request(
      method: 'uploadUserAvatar',
      arguments: { image: ArrayBuffer },
    ): EchoPluginOperation<KugouMethods['uploadUserAvatar']['result']>;
    request(
      method: 'updateUserAvatar',
      arguments: { fileName: string },
    ): EchoPluginOperation<KugouMethods['updateUserAvatar']['result']>;
    request(
      method: 'updateUserProfile',
      arguments: { patch: KugouProfilePatch },
    ): EchoPluginOperation<KugouMethods['updateUserProfile']['result']>;
    request(
      method: 'uploadPlaylistCover',
      arguments: { png: ArrayBuffer },
    ): EchoPluginOperation<KugouMethods['uploadPlaylistCover']['result']>;
    request(
      method: 'userCloud',
      arguments: { page?: number; pageSize?: number },
    ): EchoPluginOperation<KugouMethods['userCloud']['result']>;
    request(
      method: 'userCloudDelete',
      arguments: { targets: readonly KugouCloudDeleteTarget[] },
    ): EchoPluginOperation<KugouMethods['userCloudDelete']['result']>;
    request(
      method: 'userDetail',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['userDetail']['result']>;
    request(
      method: 'userGradeInfo',
      arguments: { userId?: string; automaticVerification?: boolean },
    ): EchoPluginOperation<KugouMethods['userGradeInfo']['result']>;
    request(
      method: 'userInfo',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['userInfo']['result']>;
    request(
      method: 'userPlaylists',
      arguments: { page?: number; pageSize?: number },
    ): EchoPluginOperation<KugouMethods['userPlaylists']['result']>;
    request(
      method: 'userVerify',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['userVerify']['result']>;
    request(
      method: 'userVideoCollect',
      arguments: { page?: number; pageSize?: number },
    ): EchoPluginOperation<KugouMethods['userVideoCollect']['result']>;
    request(
      method: 'userVipDetail',
      arguments?: {},
    ): EchoPluginOperation<KugouMethods['userVipDetail']['result']>;
    request(
      method: 'videoBarrage',
      arguments: { hash: string; pageSize?: number },
    ): EchoPluginOperation<KugouMethods['videoBarrage']['result']>;
    request(
      method: 'videoDetail',
      arguments: { videoId: string },
    ): EchoPluginOperation<KugouMethods['videoDetail']['result']>;
    request(
      method: 'videoPrivilege',
      arguments: { hash: string },
    ): EchoPluginOperation<KugouMethods['videoPrivilege']['result']>;
    request(
      method: 'videoUrl',
      arguments: { hash: string },
    ): EchoPluginOperation<KugouMethods['videoUrl']['result']>;
    verify(eventId: string): EchoPluginOperation<{ eventId: string; verified: true }>;
  }

  export interface EchoPluginContext {
    readonly settings: EchoPluginSettings;
    readonly cover: EchoPluginCover;
    readonly sessionInvalidated: QtSignal;
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
    readonly graphics: EchoPluginGraphics;
    readonly player: EchoPluginPlayer;
    readonly playlist: EchoPluginPlaylist;
    readonly lyrics: EchoPluginLyrics;
    readonly ui: EchoPluginUi;
    readonly tasks: EchoPluginTasks;
    readonly shortcuts: EchoPluginShortcuts;
    readonly toast: EchoPluginToast;
    readonly scroll: EchoPluginScroll;
    readonly lyricEffects: EchoPluginLyricEffects;
    readonly kugou: EchoPluginKugou;
    readonly io: EchoPluginIo;
    readonly sqlite: EchoPluginSqlite;
    readonly backups: EchoPluginBackups;
    readonly net: EchoPluginNetwork;
    readonly permissions: EchoPluginPermissions;
    readonly process: EchoPluginProcess;
    readonly server: EchoPluginServer;
    readonly webServer: EchoPluginWebServer;
    readonly files: EchoPluginFiles;
    readonly downloads: EchoPluginDownloads;
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
