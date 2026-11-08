import type {
  UiModelDefinition,
  EchoPluginContext,
  EchoUiPartRef,
  UiContributionDefinition,
} from 'echo:plugin-sdk';

export function installUi(context: EchoPluginContext, part: EchoUiPartRef) {
  const definition: UiContributionDefinition = {
    operation: 'insert',
    component: 'Actions.qml',
    position: 'after',
    axis: 'horizontal',
    gap: 4,
    priority: 20,
    layout: { preferredWidth: 100, fillHeight: true, minimumWidth: 48, maximumWidth: 180 },
    when: { selected: true },
  };
  const contribution = context.ui.parts.contribute(
    'actions',
    { role: 'control.button', key: 'play' },
    definition,
  );
  contribution?.update({ ...definition, position: 'before' });
  contribution?.matches.forEach((match) => console.log(match.state, match.error));
  context.ui.parts.queryUnique({ address: part.address });
  context.ui.parts.query({ scope: part.scope, resourceKey: part.resourceKey });
  context.ui.parts.query({ role: 'control.*', ancestor: { key: 'songDelegate' } });
  const persistent: boolean = part.persistent;
  void persistent;
  context.ui.parts.contribute(
    'bad-axis',
    {},
    // @ts-expect-error Anchored axis has a closed set of directions.
    { operation: 'insert', component: 'Actions.qml', axis: 'diagonal' },
  );
  // @ts-expect-error Relative placement is an insert option, not a hide option.
  context.ui.parts.contribute('bad-axis', {}, { operation: 'hide', axis: 'vertical' });
  const parent: string = part.parentId;
  const owner: string = part.owner;
  const composable: boolean = part.composable;
  const discovered: boolean = part.automatic;
  const positions: readonly string[] = part.insertionPositions;
  const engine: '' | 'layout' | 'positioner' = part.layoutEngine;
  context.ui.parts.query({ parentOf: { key: 'lyricTextAction-translation', surface: 'playback' } });
  context.ui.styles.registerRule('spacing', { role: 'layout.column' }, { spacing: 8 });
  void part.palette.text;
  void discovered;
  void positions;
  void engine;
  void parent;
  void owner;
  void composable;
  // @ts-expect-error Arbitrary item writes are not a layout contract.
  context.ui.parts.contribute('invalid', {}, { operation: 'layout', layout: { x: 42 } });
  context.ui.parts.contribute(
    'invalid',
    {},
    // @ts-expect-error Qt layout sizes are numeric.
    { operation: 'layout', layout: { preferredWidth: 'fill' } },
  );
  // @ts-expect-error Operations have a closed set of meanings.
  context.ui.parts.contribute('invalid', {}, { operation: 'execute-script' });
  // @ts-expect-error A wrapper requires a QML component.
  context.ui.parts.contribute('missing', {}, { operation: 'wrap' });
  // @ts-expect-error Move requires a destination selector.
  context.ui.parts.contribute('missing', {}, { operation: 'move' });
  contribution?.dispose();
}

export function nativeContracts(context: EchoPluginContext, part: EchoUiPartRef) {
  const probe = context.ui.parts.preflight(
    { address: part.address },
    {
      operation: 'wrap',
      component: 'Frame.qml',
    },
  );
  if (probe.uniqueSelector) context.ui.parts.queryUnique(probe.uniqueSelector);
  const point = part.mapPoint({ x: 1, y: 2 }, 'window');
  if (point.valid) console.log(point.x, point.y, point.window);
  const checked = part.stateSchema.checked?.type;
  const action = part.actionSchema.selectText?.required;
  const winner = part.visualSources.opacity?.owner;
  console.log(checked, action, winner);
  context.ui.styles.registerRule(
    'checked',
    { role: 'control.*', state: { checked: true } },
    {
      opacity: 0.8,
      padding: 12,
      toolTip: 'Plugin control',
    },
  );
  const rows = context.ui.parts.contributeModel(
    'rows',
    { role: 'view.items' },
    {
      kind: 'rows',
      entries: [
        { key: 'summary', component: 'Summary.qml', height: 40, values: { title: 'Summary' } },
      ],
    },
  );
  rows?.update({
    kind: 'columns',
    entries: [{ key: 'rating', component: 'Rating.qml', width: 120 }],
  });
  rows?.dispose();
  context.ui.parts.contributeModel(
    'invalid',
    {},
    // @ts-expect-error Host QObject values cannot be passed as row data.
    { kind: 'rows', entries: [{ key: 'bad', component: 'Bad.qml', values: { part } }] },
  );
  // @ts-expect-error Only the declared coordinate spaces are supported.
  part.mapPoint({ x: 0, y: 0 }, 'screen-device-pixels');
}

export function semanticModels(context: EchoPluginContext) {
  context.ui.parts.contributeModel(
    'menu',
    { role: 'model.menu' },
    {
      kind: 'menu',
      entries: [
        { key: 'separator', separator: true },
        { key: 'action', label: 'Plugin action', command: 'toggle', checkable: true },
      ],
    },
  );
  context.ui.parts.contributeModel(
    'tabs',
    { role: 'model.tabs' },
    {
      kind: 'tabs',
      entries: [
        {
          key: 'page',
          label: 'Plugin page',
          component: 'Page.qml',
          contentTarget: { address: '/main/page/content' },
        },
      ],
    },
  );
  context.ui.parts.contributeModel(
    'settings',
    { role: 'model.settings' },
    {
      kind: 'settings',
      entries: [
        {
          key: 'section',
          label: 'Plugin settings',
          component: 'Settings.qml',
          keywords: 'spectrum',
        },
      ],
    },
  );
  context.ui.parts.contributeModel(
    'invalid',
    {},
    // @ts-expect-error A tab must identify its actual public content region.
    {
      kind: 'tabs',
      entries: [{ key: 'page', label: 'Plugin page', component: 'Page.qml' }],
    },
  );
}

export function groupedUi(context: EchoPluginContext) {
  const batch = context.ui.parts.applyBatch('toolbar', [
    { id: 'spacing', selector: { key: 'toolbar' }, style: { spacing: 8 } },
    {
      id: 'action',
      selector: { key: 'translation' },
      definition: { operation: 'insert', position: 'after', component: 'Action.qml' },
    },
  ]);
  batch?.rejected.connect((message) => console.log(message));
  batch?.update([{ id: 'spacing', selector: { key: 'toolbar' }, style: { spacing: 12 } }]);
  batch?.cancel();
  batch?.dispose();
  context.ui.parts.applyBatch('invalid', [
    // @ts-expect-error One entry cannot supply both style and structural definitions.
    { id: 'both', selector: {}, style: { opacity: 0.5 }, definition: { operation: 'hide' } },
  ]);
}

function completeModels(context: EchoPluginContext) {
  const columns: UiModelDefinition = {
    kind: 'columns',
    entries: [
      {
        key: 'note',
        component: 'Note.qml',
        label: 'Notes',
        width: 120,
        position: 'before',
        anchor: 'native:album',
        command: 'sort-notes',
      },
    ],
  };
  context.ui.parts.preflight({ key: 'songs' }, columns);
  context.ui.parts.preflight({ role: 'song.row' }, { style: { radius: 4 } });
  context.ui.parts.preflightBatch([{ id: 'notes', selector: { key: 'songs' }, model: columns }]);
  context.ui.parts
    .contributeModel(
      'context-menu',
      { role: 'model.menu' },
      { kind: 'menu', entries: [] },
      async (snapshot) => {
        const resource = snapshot.values.resourceId;
        return [
          {
            key: 'tools',
            label: String(resource),
            children: [{ key: 'run', label: 'Run', command: 'run' }],
          },
        ];
      },
    )
    ?.cancel();
  context.ui.parts.contributeModel(
    'order',
    { key: 'songs' },
    { kind: 'rows', entries: [{ key: 'hide', operation: 'hide', target: 'native:track-1' }] },
  );
  // @ts-expect-error model definitions cannot use an arbitrary native Item pointer
  context.ui.parts.preflight({}, { kind: 'rows', entries: [{ key: 'bad', component: {} }] });
}
