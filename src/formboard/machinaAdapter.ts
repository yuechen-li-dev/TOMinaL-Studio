import { D, type MachinaDiagnostic } from 'machinalayout/diagnostics';

import type { Diagnostic } from '@/harness-core';
import type { FormboardProjection, MachinaSceneRecord } from './projection';
import { formboardProjectionToMachinaScene } from './projection';

export type MachinaFormboardArtifact = {
  readonly scene: readonly MachinaSceneRecord[];
  readonly diagnostics: readonly MachinaDiagnostic[];
};

/**
 * The supported Machina boundary. Tominal retains semantic EntityRef and mm geometry;
 * Machina contributes its public deterministic diagnostic transport/sorting contract.
 */
export function toMachinaDiagnostics(diagnostics: readonly Diagnostic[]): readonly MachinaDiagnostic[] {
  return D.sort(
    D.from(
      diagnostics.map((item) => ({
        severity: item.severity,
        code: item.rule,
        message: item.message,
        path: `${item.entity.kind}/${item.entity.id}`,
        source: 'tominal.formboard',
        details: [item.id]
      }))
    )
  );
}

export function createMachinaFormboardArtifact(
  projection: FormboardProjection,
  diagnostics: readonly Diagnostic[] = []
): MachinaFormboardArtifact {
  return {
    scene: formboardProjectionToMachinaScene(projection),
    diagnostics: toMachinaDiagnostics(diagnostics)
  };
}

