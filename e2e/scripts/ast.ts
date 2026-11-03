import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import type { Spec } from './contracts';
import { resolve, relative } from 'node:path';
export const testFiles = () => readdirSync('e2e/tests').filter(f => f.endsWith('.spec.ts')).map(f => `e2e/tests/${f}`);
export function analyze(files = testFiles()) {
  const tests: { testId: string; file: string }[] = [];
  const steps: { testId: string; actionId: string; file: string; pageObjects?: string[] }[] = [];
  const assertions: { testId: string; actionId: string; file: string }[] = [];
  const errors: string[] = [];
  const forbidden = new Set(['locator','getByRole','getByLabel','getByTestId','getByText','getByPlaceholder',
    'getByTitle','getByAltText','$','$$','click','dblclick','fill','selectOption','check','uncheck','press','type','tap',
    'goto','reload','goBack','goForward','evaluate','evaluateHandle','dispatchEvent','waitForTimeout','setInputFiles',
    'setViewportSize','newPage','request','route','screenshot','install','runFor','fastForward','pauseAt','resume']);
  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext, skipLibCheck: true, noEmit: true,
  });
  const checker = program.getTypeChecker();
  const mutations = new Set(['click','dblclick','fill','selectOption','check','uncheck','press','type','tap',
    'goto','reload','goBack','goForward','evaluate','evaluateHandle','dispatchEvent','waitForTimeout','setInputFiles',
    'setViewportSize','newPage','route','install','runFor','fastForward','pauseAt','resume']);
  const memberName = (expression: ts.Expression): string => ts.isPropertyAccessExpression(expression)
    ? expression.name.text : ts.isElementAccessExpression(expression) && expression.argumentExpression
      && ts.isStringLiteral(expression.argumentExpression) ? expression.argumentExpression.text : '';
  const evidenceCall = (node: ts.Node, name: string): node is ts.CallExpression => ts.isCallExpression(node)
    && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression)
    && node.expression.expression.text === 'evidence' && node.expression.name.text === name;
  function inEvidenceCallback(node: ts.Node, name: string): boolean {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if ((ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) && parent.parent
        && evidenceCall(parent.parent, name) && parent.parent.arguments[3] === parent) return true;
    }
    return false;
  }
  // A plain browser property read is observable state, not a business mutation.
  // Treat every other evaluate callback conservatively as potentially mutating.
  const isPurePropertyRead = (node: ts.Node): boolean => {
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return true;
    if (ts.isPropertyAccessExpression(node)) return isPurePropertyRead(node.expression);
    if (ts.isElementAccessExpression(node)) return isPurePropertyRead(node.expression)
      && !!node.argumentExpression && isPurePropertyRead(node.argumentExpression);
    return false;
  };
  const isReadOnlyEvaluation = (node: ts.CallExpression): boolean => {
    if (memberName(node.expression) !== 'evaluate') return false;
    const callback = node.arguments[0];
    return !!callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
      && isPurePropertyRead(callback.body);
  };
  const callableOrUnknown = (node: ts.Node): boolean => {
    const type = checker.getTypeAtLocation(node);
    return type.getCallSignatures().length > 0 || !!(type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown));
  };
  const mutationCache = new Map<ts.Declaration, boolean>();
  function isPomMutation(declaration: ts.Declaration | undefined, seen = new Set<ts.Declaration>()): boolean {
    if (!declaration || !/[\\/]pages[\\/]/.test(declaration.getSourceFile().fileName)
      || !ts.isMethodDeclaration(declaration) || !declaration.body) return false;
    if (mutationCache.has(declaration)) return mutationCache.get(declaration)!;
    if (seen.has(declaration)) return false;
    seen.add(declaration);
    let mutates = false;
    const scan = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        if ((mutations.has(memberName(node.expression)) && !isReadOnlyEvaluation(node))
          || isPomMutation(checker.getResolvedSignature(node)?.declaration, seen)) mutates = true;
      }
      if (!mutates) ts.forEachChild(node, scan);
    };
    scan(declaration.body); mutationCache.set(declaration, mutates); return mutates;
  }
  for (const file of files) {
    const source = program.getSourceFile(file) ?? program.getSourceFile(resolve(file))
      ?? ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const expectNames = new Set(['expect']);
    const collectExpectAliases = (node: ts.Node) => {
      if (ts.isImportSpecifier(node) && (node.propertyName ?? node.name).text === 'expect') expectNames.add(node.name.text);
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
        && ((ts.isIdentifier(node.initializer) && expectNames.has(node.initializer.text))
          || (ts.isPropertyAccessExpression(node.initializer) && ts.isIdentifier(node.initializer.expression)
            && expectNames.has(node.initializer.expression.text)))) expectNames.add(node.name.text);
      ts.forEachChild(node, collectExpectAliases);
    };
    collectExpectAliases(source);
    const isExpectCall = (node: ts.Node): node is ts.CallExpression => ts.isCallExpression(node)
      && ((ts.isIdentifier(node.expression) && expectNames.has(node.expression.text))
        || (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression)
          && expectNames.has(node.expression.expression.text)));
    const matcherObjects = new Set<string>();
    const matcherFunctions = new Set<string>();
    const hasExpectReceiver = (expression: ts.Expression): boolean => {
      if (isExpectCall(expression) || (ts.isIdentifier(expression) && matcherObjects.has(expression.text))) return true;
      return (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression))
        && hasExpectReceiver(expression.expression);
    };
    const collectMatcherAliases = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        if (hasExpectReceiver(node.initializer)) matcherObjects.add(node.name.text);
        if (ts.isPropertyAccessExpression(node.initializer) && node.initializer.name.text.startsWith('to')
          && hasExpectReceiver(node.initializer.expression)) matcherFunctions.add(node.name.text);
        if (ts.isIdentifier(node.initializer) && matcherFunctions.has(node.initializer.text)) matcherFunctions.add(node.name.text);
      }
      ts.forEachChild(node, collectMatcherAliases);
    };
    collectMatcherAliases(source);
    const isAwaitedOrReturned = (node: ts.Expression, callbackKind: 'assert' | 'test'): boolean => {
      let current: ts.Node = node;
      while (ts.isParenthesizedExpression(current.parent) || ts.isAsExpression(current.parent)
        || ts.isNonNullExpression(current.parent)) current = current.parent;
      if (ts.isAwaitExpression(current.parent)) return true;
      const parent = current.parent;
      if (ts.isReturnStatement(parent)) {
        for (let ancestor = parent.parent; ancestor; ancestor = ancestor.parent) {
          if (ts.isArrowFunction(ancestor) || ts.isFunctionExpression(ancestor)) {
            const call = ancestor.parent;
            return callbackKind === 'assert' ? evidenceCall(call, 'assert') && call.arguments[3] === ancestor
              : ts.isCallExpression(call) && ts.isIdentifier(call.expression) && call.expression.text === 'test'
                && call.arguments[1] === ancestor;
          }
        }
      }
      if (ts.isArrowFunction(parent) && parent.body === current) {
        const call = parent.parent;
        return callbackKind === 'assert' ? evidenceCall(call, 'assert') && call.arguments[3] === parent
          : ts.isCallExpression(call) && ts.isIdentifier(call.expression) && call.expression.text === 'test'
            && call.arguments[1] === parent;
      }
      return false;
    };
    const containsAssertion = (node: ts.Node): boolean => {
      if (isExpectCall(node) || evidenceCall(node, 'assert')) return true;
      let found = false; ts.forEachChild(node, child => { if (containsAssertion(child)) found = true; }); return found;
    };
    let usesPom = false;
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.includes('/pages/')) usesPom = true;
      if (ts.isPropertyAccessExpression(node) && forbidden.has(node.name.text)
        && (node.name.text === 'request' || callableOrUnknown(node))) errors.push(`${file}: forbidden UI member ${node.name.text}`);
      if (ts.isBindingElement(node)) {
        const property = node.propertyName ?? node.name;
        if ((ts.isIdentifier(property) || ts.isStringLiteral(property)) && forbidden.has(property.text) && (property.text === 'request' || callableOrUnknown(node.name))) errors.push(`${file}: destructured UI operation ${property.text}`);
        const declaration = node.parent.parent;
        if ((ts.isIdentifier(property) || ts.isStringLiteral(property)) && ts.isVariableDeclaration(declaration) && declaration.initializer) {
          const symbol = checker.getPropertyOfType(checker.getTypeAtLocation(declaration.initializer), property.text);
          if (symbol?.getDeclarations()?.some(d => isPomMutation(d)) && !inEvidenceCallback(node, 'step')) {
            errors.push(`${file}: destructured POM business operation requires evidence.step callback`);
          }
        }
      }
      if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))) {
        const symbol = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression!);
        const declarations = symbol?.getDeclarations() ?? [];
        if (declarations.some(d => isPomMutation(d)) && !inEvidenceCallback(node, 'step')) {
          errors.push(`${file}: POM business operation ${memberName(node)} requires evidence.step callback`);
        }
      }
      if (ts.isTryStatement(node) && node.catchClause && containsAssertion(node.tryBlock)) {
        const statements = node.catchClause.block.statements;
        const variable = node.catchClause.variableDeclaration?.name;
        const last = statements.at(-1);
        if (statements.length !== 1 || !last || !ts.isThrowStatement(last) || !last.expression || !variable
          || !ts.isIdentifier(variable) || !ts.isIdentifier(last.expression) || variable.text !== last.expression.text) {
          errors.push(`${file}: assertion failure may be swallowed by catch`);
        }
      }
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        if ((((ts.isPropertyAccessExpression(expr) || ts.isElementAccessExpression(expr))
          && hasExpectReceiver(expr.expression)) || (ts.isIdentifier(expr) && matcherFunctions.has(expr.text)))
          && !isAwaitedOrReturned(node, 'assert')) {
          errors.push(`${file}: expect matcher must be awaited or returned from evidence.assert callback`);
        }
        if ((evidenceCall(node, 'assert') || evidenceCall(node, 'step')) && !isAwaitedOrReturned(node, 'test')) {
          errors.push(`${file}: evidence operation must be awaited or returned from test callback`);
        }
        if (isExpectCall(node) && !inEvidenceCallback(node, 'assert')) errors.push(`${file}: expect requires evidence.assert callback`);
        if (ts.isPropertyAccessExpression(expr) && (expr.name.text === 'catch' || (expr.name.text === 'then' && node.arguments.length > 1)) && containsAssertion(expr.expression)) {
          errors.push(`${file}: assertion promise catch may swallow failure`);
        }
        if (isPomMutation(checker.getResolvedSignature(node)?.declaration) && !inEvidenceCallback(node, 'step')) {
          errors.push(`${file}: POM business operation requires evidence.step callback`);
        }
        if (ts.isElementAccessExpression(expr) && (!expr.argumentExpression || !ts.isStringLiteral(expr.argumentExpression))) errors.push(`${file}: dynamic method call forbidden`);
        const name = ts.isPropertyAccessExpression(expr) ? expr.name.text : ts.isElementAccessExpression(expr) && expr.argumentExpression && ts.isStringLiteral(expr.argumentExpression) ? expr.argumentExpression.text : '';
        if (forbidden.has(name)) errors.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1} direct UI operation ${name}`);
        if (ts.isIdentifier(expr) && ['test', 'expect'].includes(expr.text)) {
          if (expr.text === 'test' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
            const id = node.arguments[0].text.match(/^E2E-\d{3}\b/)?.[0];
            if (id) tests.push({ testId: id, file }); else errors.push(`Missing test ID ${file}`);
          }
        }
        if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === 'evidence' && ['step','assert'].includes(name)) {
          const [id, action] = node.arguments;
          if (id && action && ts.isStringLiteral(id) && ts.isStringLiteral(action)) {
            if (name === 'step') {
              const pageObjects = new Set<string>();
              const inspectOperation = (child: ts.Node) => {
                if (ts.isCallExpression(child)) {
                  const declaration = checker.getResolvedSignature(child)?.declaration;
                  if (declaration && ts.isMethodDeclaration(declaration) && /[\\/]pages[\\/]/.test(declaration.getSourceFile().fileName)
                    && ts.isClassDeclaration(declaration.parent) && declaration.parent.name) {
                    pageObjects.add(relative(process.cwd(), declaration.getSourceFile().fileName).replaceAll('\\', '/') + '#' + declaration.parent.name.text);
                  }
                }
                ts.forEachChild(child, inspectOperation);
              };
              if (node.arguments[3]) inspectOperation(node.arguments[3]);
              steps.push({ testId: id.text, actionId: action.text, file, pageObjects: [...pageObjects] });
            } else assertions.push({ testId: id.text, actionId: action.text, file });
          } else errors.push(`Nonliteral evidence ID ${file}:${node.getStart()}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    if (!usesPom) errors.push(`No Page Object import ${file}`);
  }
  return { tests, steps, assertions, errors };
}
export function implementationErrors(spec: Spec, result = analyze()): string[] {
  const errors = [...result.errors];
  const checkDuplicate = (values: string[], kind: string) => { if (new Set(values).size !== values.length) errors.push(`Duplicate implemented ${kind}`); };
  checkDuplicate(result.tests.map(t => t.testId), 'test'); checkDuplicate(result.steps.map(a => a.actionId), 'action');
  for (const t of spec.tests) {
    if (!result.tests.some(i => i.testId === t.testId && i.file === t.testFile)) errors.push(`Unimplemented test ${t.testId}`);
    for (const a of t.actions) {
      if (!result.steps.some(i => i.testId === t.testId && i.actionId === a.actionId && i.file === t.testFile)) errors.push(`Unimplemented action ${a.actionId}`);
      const implemented = result.steps.find(i => i.testId === t.testId && i.actionId === a.actionId);
      if (a.pageObject.includes('#') && !implemented?.pageObjects?.includes(a.pageObject)) errors.push(`POM reference mismatch ${a.actionId}`);
      if (!result.assertions.some(i => i.testId === t.testId && i.actionId === a.actionId && i.file === t.testFile)) errors.push(`No assertion implementation ${a.actionId}`);
    }
  }
  for (const t of result.tests) if (!spec.tests.some(i => i.testId === t.testId)) errors.push(`Unspecified test ${t.testId}`);
  for (const a of result.steps) if (!spec.tests.some(t => t.testId === a.testId && t.actions.some(i => i.actionId === a.actionId))) errors.push(`Unspecified action ${a.actionId}`);
  return errors;
}
