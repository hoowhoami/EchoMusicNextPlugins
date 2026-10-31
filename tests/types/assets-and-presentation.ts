import {
  awaitOperation,
  type EchoPluginContext,
  type EchoPluginViewContext,
  type ImageCapture,
  type PointMesh,
  type PresentationScope,
  type QtQuickItem,
} from 'echo:plugin-sdk';

async function useAssets(ctx: EchoPluginContext, view: EchoPluginViewContext) {
  const result = await awaitOperation(ctx.assets.list('images'));
  const handle: string | undefined = result.assets[0]?.handle;
  const sample = await awaitOperation(ctx.assets.sampleImage(ctx.player.coverUrl, 64, 64));
  const pixels: readonly number[] = sample.pixels;
  const animation = ctx.assets.animation(ctx.player.coverUrl, 128, 128, 'cover');
  if (animation) {
    animation.playing = false;
    animation.frameChanged.connect(() => void animation.frameSource);
    animation.setPlaying(true);
    // @ts-expect-error readiness is owned by the native decoder
    animation.ready = true;
    // @ts-expect-error playing accepts a boolean
    animation.setPlaying('true');
    animation.dispose();
  }
  const archive = ctx.assets.openImageArchive(['metadata.json']);
  if (archive?.ready) {
    const selected = archive.entries.map((entry) => ({ path: entry.path }));
    await awaitOperation(archive.importInto('images', selected));
    archive.dispose();
  }
  if (ctx.text.available) {
    const words = await awaitOperation(ctx.text.segmentWords(['中文 words'], 'zh'));
    const offset: number | undefined = words.lines[0]?.[0]?.index;
    void offset;
  }
  ctx.fonts.familiesChanged.connect(() => void ctx.fonts.families);
  view.aboutToClose.connect(() => void view.active);
  await awaitOperation(view.closeSkinSettings());
  // @ts-expect-error dimensions are numeric
  ctx.assets.sampleImage(ctx.player.coverUrl, '64');
  void [handle, pixels];
}

function usePresentation(
  capture: ImageCapture,
  mesh: PointMesh,
  scope: PresentationScope,
  source: QtQuickItem,
) {
  capture.active = scope.presented;
  mesh.pointCount = 150;
  const picture = capture.encode(source, 1920, 1080, 'jpeg', 92);
  picture.changed.connect(() => void picture.url);
  picture.dispose();
  // @ts-expect-error encoded outputs are native-owned
  picture.url = 'file:///invalid';
  // @ts-expect-error presentation state is observed, not assigned
  scope.presented = true;
  // @ts-expect-error capture returns a lease, not a string URL
  const url: string = capture.encode(source, 100, 100);
  void url;
}
void [useAssets, usePresentation];
