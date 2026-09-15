export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type EntityRef = {
  readonly kind:
    | 'harness'
    | 'connectorFamily'
    | 'connectorOccurrence'
    | 'cavity'
    | 'circuit'
    | 'conductor'
    | 'termination'
    | 'electricalSplice'
    | 'routeJunction'
    | 'route'
    | 'routeSegment'
    | 'catalogPart'
    | 'migration';
  readonly id: string;
};

export type DiagnosticCorrection = {
  readonly commandId: string;
  readonly label: string;
};

export type Diagnostic = {
  readonly id: string;
  readonly severity: DiagnosticSeverity;
  readonly rule: string;
  readonly entity: EntityRef;
  readonly message: string;
  readonly correction?: DiagnosticCorrection;
};

export function sortDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((left, right) =>
    [left.severity, left.rule, left.entity.kind, left.entity.id, left.id]
      .join('|')
      .localeCompare([right.severity, right.rule, right.entity.kind, right.entity.id, right.id].join('|'))
  );
}

