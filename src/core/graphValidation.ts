import { isTerminalCompatibleWithHousing, isWireTypeCompatibleWithConnectorTerminal } from '@/catalog/compatibility';
import type { ConnectorHousing, WireType } from '@/catalog/schemas';
import { resolveBindingStatus, type BindingStatus } from '@/core/bindingStatus';
import type { Connector, ConnectorPin, HarnessDocument, Wire } from '@/core/harnessModel';

export type GraphValidationStatus = BindingStatus;

export type GraphValidationScope = 'connector' | 'wire' | 'connectorPin' | 'wireEndpoint';

export type GraphValidationRule =
  | 'connector-housing-binding'
  | 'wire-type-binding'
  | 'connector-terminal-membership'
  | 'wire-gauge-terminal-compatibility';

export type GraphValidationResult = {
  status: GraphValidationStatus;
  scope: GraphValidationScope;
  entityId: string;
  rule: GraphValidationRule;
  message: string;
};

export type GraphValidationCatalog = {
  connectorHousings: ConnectorHousing[];
  wireTypes: WireType[];
};

function findPin(document: HarnessDocument, endpoint: { connectorId: string; pinId: string }): ConnectorPin | undefined {
  return document.connectors[endpoint.connectorId]?.pins[endpoint.pinId];
}

function validateConnectorHousingBinding(connectors: Connector[], catalog: GraphValidationCatalog): GraphValidationResult[] {
  return connectors.map((connector) => {
    const binding = resolveBindingStatus(
      connector.housingId,
      catalog.connectorHousings.map((housing) => housing.id)
    );

    const message =
      binding.status === 'valid'
        ? `Connector ${connector.id} is bound to housing ${binding.referenceId}.`
        : binding.status === 'invalid'
          ? `Connector ${connector.id} references missing housing ${binding.referenceId}.`
          : `Connector ${connector.id} has no housing binding.`;

    return {
      status: binding.status,
      scope: 'connector',
      entityId: connector.id,
      rule: 'connector-housing-binding',
      message
    };
  });
}

function validateWireTypeBinding(wires: Wire[], catalog: GraphValidationCatalog): GraphValidationResult[] {
  return wires.map((wire) => {
    const binding = resolveBindingStatus(wire.wireTypeId, catalog.wireTypes.map((wireType) => wireType.id));

    const message =
      binding.status === 'valid'
        ? `Wire ${wire.id} is bound to wire type ${binding.referenceId}.`
        : binding.status === 'invalid'
          ? `Wire ${wire.id} references missing wire type ${binding.referenceId}.`
          : `Wire ${wire.id} has no wire type binding.`;

    return {
      status: binding.status,
      scope: 'wire',
      entityId: wire.id,
      rule: 'wire-type-binding',
      message
    };
  });
}

function validateConnectorTerminalMembership(connectors: Connector[], catalog: GraphValidationCatalog): GraphValidationResult[] {
  return connectors.flatMap<GraphValidationResult>((connector) => {
    const housingBinding = resolveBindingStatus(
      connector.housingId,
      catalog.connectorHousings.map((housing) => housing.id)
    );
    const assignedPins = Object.entries(connector.pins).filter(([, pin]) => pin.terminalPartNumber);

    if (assignedPins.length === 0) {
      return [];
    }

    if (housingBinding.status !== 'valid' || !housingBinding.referenceId) {
      return assignedPins.map(([pinId, pin]) => ({
        status: 'unbound' as const,
        scope: 'connectorPin' as const,
        entityId: `${connector.id}:${pinId}`,
        rule: 'connector-terminal-membership' as const,
        message: `Connector ${connector.id} pin ${pinId} terminal ${pin.terminalPartNumber} cannot be validated without a valid housing binding.`
      }));
    }

    const housing = catalog.connectorHousings.find((item) => item.id === housingBinding.referenceId);

    if (!housing) {
      return [];
    }

    return assignedPins.map(([pinId, pin]) => {
      const terminalPartNumber = pin.terminalPartNumber ?? '';
      const compatibility = isTerminalCompatibleWithHousing(
        { terminals: housing.terminals.map((terminal) => ({ id: terminal.partNumber })) },
        terminalPartNumber
      );
      const status: GraphValidationStatus = compatibility.isCompatible ? 'valid' : 'invalid';

      return {
        status,
        scope: 'connectorPin' as const,
        entityId: `${connector.id}:${pinId}`,
        rule: 'connector-terminal-membership' as const,
        message: compatibility.isCompatible
          ? `Connector ${connector.id} pin ${pinId} terminal ${terminalPartNumber} exists in housing ${housing.id}.`
          : `Connector ${connector.id} pin ${pinId} terminal ${terminalPartNumber} is not listed in housing ${housing.id}.`
      };
    });
  });
}

function validateWireGaugeToTerminal(
  document: HarnessDocument,
  wires: Wire[],
  catalog: GraphValidationCatalog
): GraphValidationResult[] {
  return wires.flatMap<GraphValidationResult>((wire) => {
    const wireTypeBinding = resolveBindingStatus(wire.wireTypeId, catalog.wireTypes.map((wireType) => wireType.id));

    return [wire.from, wire.to].map((endpoint) => {
      const pin = findPin(document, endpoint);
      const endpointId = `${wire.id}:${endpoint.connectorId}:${endpoint.pinId}`;

      if (!pin?.terminalPartNumber || wireTypeBinding.status !== 'valid' || !wireTypeBinding.referenceId) {
        return {
          status: 'unbound' as const,
          scope: 'wireEndpoint' as const,
          entityId: endpointId,
          rule: 'wire-gauge-terminal-compatibility' as const,
          message: `Wire ${wire.id} endpoint ${endpoint.connectorId}:${endpoint.pinId} lacks wire type or terminal data for gauge compatibility.`
        };
      }

      const connector = document.connectors[endpoint.connectorId];
      const housingBinding = resolveBindingStatus(
        connector?.housingId,
        catalog.connectorHousings.map((housing) => housing.id)
      );

      if (housingBinding.status !== 'valid' || !housingBinding.referenceId) {
        return {
          status: 'unbound' as const,
          scope: 'wireEndpoint' as const,
          entityId: endpointId,
          rule: 'wire-gauge-terminal-compatibility' as const,
          message: `Wire ${wire.id} endpoint ${endpoint.connectorId}:${endpoint.pinId} lacks a valid connector housing binding.`
        };
      }

      const housing = catalog.connectorHousings.find((item) => item.id === housingBinding.referenceId);
      const wireType = catalog.wireTypes.find((item) => item.id === wireTypeBinding.referenceId);

      if (!housing || !wireType) {
        return {
          status: 'unbound' as const,
          scope: 'wireEndpoint' as const,
          entityId: endpointId,
          rule: 'wire-gauge-terminal-compatibility' as const,
          message: `Wire ${wire.id} endpoint ${endpoint.connectorId}:${endpoint.pinId} missing catalog records for compatibility check.`
        };
      }

      const terminal = housing.terminals.find((item) => item.partNumber === pin.terminalPartNumber);

      if (!terminal) {
        return {
          status: 'unbound' as const,
          scope: 'wireEndpoint' as const,
          entityId: endpointId,
          rule: 'wire-gauge-terminal-compatibility' as const,
          message: `Wire ${wire.id} endpoint ${endpoint.connectorId}:${endpoint.pinId} terminal ${pin.terminalPartNumber} is not in housing ${housing.id}.`
        };
      }

      const compatibility = isWireTypeCompatibleWithConnectorTerminal(wireType, terminal);
      return {
        status: compatibility.isCompatible ? 'valid' : 'invalid',
        scope: 'wireEndpoint' as const,
        entityId: endpointId,
        rule: 'wire-gauge-terminal-compatibility' as const,
        message: compatibility.isCompatible
          ? `Wire ${wire.id} endpoint ${endpoint.connectorId}:${endpoint.pinId} gauge ${wireType.gauge} is compatible with terminal ${terminal.partNumber}.`
          : `Wire ${wire.id} endpoint ${endpoint.connectorId}:${endpoint.pinId} gauge ${wireType.gauge} is incompatible with terminal ${terminal.partNumber}.`
      };
    });
  });
}

export function validateGraphCompatibility(
  document: HarnessDocument,
  catalog: GraphValidationCatalog
): GraphValidationResult[] {
  const connectors = Object.values(document.connectors);
  const wires = Object.values(document.wires);

  return [
    ...validateConnectorHousingBinding(connectors, catalog),
    ...validateWireTypeBinding(wires, catalog),
    ...validateConnectorTerminalMembership(connectors, catalog),
    ...validateWireGaugeToTerminal(document, wires, catalog)
  ];
}

export function summarizeGraphValidation(results: GraphValidationResult[]) {
  return results.reduce(
    (summary, result) => {
      summary[result.status] += 1;
      return summary;
    },
    { valid: 0, unbound: 0, invalid: 0 }
  );
}
