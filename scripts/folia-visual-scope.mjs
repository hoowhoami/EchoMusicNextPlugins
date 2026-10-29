// Build-time scope adaptation: remove optional analysis branches, preserving
// the original lyric, transition, spectrum and background source expressions.
import ts from 'typescript';
export function withoutBeatAnalysis(code, file = 'source.ts') {
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const removed = new Set(
    file.includes('DioramaScene')
      ? ['hopUnitRef', 'hopBeatsRef', 'fired', 'beatFxOn', 'hop']
      : file.includes('DioramaParticleField')
        ? ['beatCounterRef', 'beatTriggers', 'beatFxActive']
        : file === 'runtime-frame.mjs'
          ? ['beatFx', 'beatTearWins']
          : file === 'sonnetShotMg.mjs'
            ? ['onsetPop', 'onsetK', 'onsetScale']
            : file === 'helpers.mjs'
              ? ['resolveLatentBeatFxPulse']
              : [],
  );
  const result = ts.transform(source, [
    (context) => {
      const visit = (node) => {
        const text = () => node.getText(source);
        if (
          ts.isImportDeclaration(node) &&
          /(?:beatFx\/|motionSignals|dioramaBeatRipples|sonnetBeatFx)/.test(
            node.moduleSpecifier.text,
          )
        )
          return undefined;
        if (
          ts.isVariableStatement(node) &&
          node.declarationList.declarations.every(
            (d) => ts.isIdentifier(d.name) && removed.has(d.name.text),
          )
        )
          return undefined;
        if (
          ts.isExpressionStatement(node) &&
          /^(?:beatCounterRef|hopUnitRef|hopBeatsRef)\.current\s*=/.test(text())
        )
          return undefined;
        if (
          ts.isExpressionStatement(node) &&
          text().includes('unitPlanesRef.current.unitGroups.forEach') &&
          text().includes('hopUnitRef')
        )
          return undefined;
        if (ts.isIfStatement(node) && node.expression.getText(source) === '!onsetPop')
          return ts.visitNode(node.thenStatement, visit);
        if (
          ts.isIfStatement(node) &&
          /^(?:beatFxActive|beatFxOn|beatFx)(?:\s|&&|$)/.test(node.expression.getText(source))
        )
          return undefined;
        if (
          ts.isConditionalExpression(node) &&
          ['beatFxActive', 'beatTearWins', 'onsetPop'].includes(node.condition.getText(source))
        )
          return ts.visitNode(node.whenFalse, visit);
        if (ts.isObjectBindingPattern(node))
          return context.factory.updateObjectBindingPattern(
            node,
            node.elements
              .filter((e) => !['smartBeatEnabled', 'beatFx'].includes(e.name.getText(source)))
              .map((e) => ts.visitNode(e, visit)),
          );
        if (
          (ts.isPropertyAssignment(node) ||
            ts.isShorthandPropertyAssignment(node) ||
            ts.isPropertySignature(node)) &&
          ['smartBeatEnabled', 'beatFx'].includes(node.name?.getText(source))
        )
          return undefined;
        if (ts.isParameter(node) && node.name.getText(source) === 'smartBeatEnabled')
          return undefined;
        if (ts.isPropertyAccessExpression(node) && node.name.text === 'smartBeatEnabled')
          return context.factory.createFalse();
        if (ts.isIdentifier(node) && node.text === 'smartBeatEnabled')
          return context.factory.createFalse();
        return ts.visitEachChild(node, visit, context);
      };
      return (node) => ts.visitNode(node, visit);
    },
  ]);
  const output = ts.createPrinter({ removeComments: true }).printFile(result.transformed[0]);
  result.dispose();
  return output;
}
