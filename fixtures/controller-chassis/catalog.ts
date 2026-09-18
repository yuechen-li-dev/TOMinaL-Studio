import { Motor3Family, Power3Family, Sensor3Family, Service3Family } from './connectorFamilies.generated';

import {
  catalogPartId,
  crossSection,
  gaugeAllowance,
  mm,
  studId,
  wireTypeId,
  withCatalogHash
} from '@/harness-core';

export const controllerChassisCatalog = withCatalogHash({
  snapshotId: 'controller-chassis-demo-v1',
  connectorFamilies: [
    Motor3Family.definition,
    Power3Family.definition,
    Sensor3Family.definition,
    Service3Family.definition
  ],
  terminals: [
    {
      id: catalogPartId('TERM_POWER'),
      manufacturer: 'Tominal Demo Parts',
      partNumber: 'DEMO-TERM-PWR',
      compatibleGauge: gaugeAllowance(0.75, 1.5),
      allowedSealIds: [catalogPartId('SEAL_POWER')]
    },
    {
      id: catalogPartId('TERM_GROUND'),
      manufacturer: 'Tominal Demo Parts',
      partNumber: 'DEMO-TERM-GND',
      compatibleGauge: gaugeAllowance(0.75, 1.5),
      allowedSealIds: [catalogPartId('SEAL_POWER')]
    },
    {
      id: catalogPartId('TERM_SIGNAL'),
      manufacturer: 'Tominal Demo Parts',
      partNumber: 'DEMO-TERM-SIG',
      compatibleGauge: gaugeAllowance(0.13, 0.35),
      allowedSealIds: [catalogPartId('SEAL_SIGNAL')]
    }
  ],
  seals: [
    { id: catalogPartId('SEAL_POWER'), manufacturer: 'Tominal Demo Parts', partNumber: 'DEMO-SEAL-PWR' },
    { id: catalogPartId('SEAL_SIGNAL'), manufacturer: 'Tominal Demo Parts', partNumber: 'DEMO-SEAL-SIG' }
  ],
  plugs: [{ id: catalogPartId('PLUG_DEMO'), manufacturer: 'Tominal Demo Parts', partNumber: 'DEMO-PLUG' }],
  ringTerminals: [
    {
      id: catalogPartId('RING_M4'),
      manufacturer: 'Tominal Demo Parts',
      partNumber: 'DEMO-RING-M4',
      compatibleGauge: gaugeAllowance(0.75, 1.5),
      compatibleStudSizes: ['M4'],
      insulation: 'bare',
      barrelOuterDiameterMm: mm(3.8),
      barrelLengthMm: mm(8),
      heatShrinkPolicy: {
        requiresHeatShrink: true,
        heatShrinkCatalogPartId: catalogPartId('HEATSHRINK_5_1P5'),
        minWireOverlapMm: mm(6),
        terminalClearanceMm: mm(1)
      }
    }
  ],
  wireTypes: [
    {
      id: wireTypeId('WIRE_POWER_1MM2'),
      manufacturer: 'Tominal Demo Parts',
      partNumber: 'DEMO-WIRE-1.0',
      gauge: crossSection(1),
      insulation: 'PVC demo',
      insulatedOuterDiameterMm: mm(2.4),
      outerDiameterProvenance: 'catalog-exact',
      allowedColors: ['RD', 'BK', 'GN']
    },
    {
      id: wireTypeId('WIRE_SIGNAL_022MM2'),
      manufacturer: 'Tominal Demo Parts',
      partNumber: 'DEMO-WIRE-0.22',
      gauge: crossSection(0.22),
      insulation: 'PVC demo',
      insulatedOuterDiameterMm: mm(1.3),
      outerDiameterProvenance: 'catalog-exact',
      allowedColors: ['WH', 'BU', 'YE', 'VT', 'GY']
    }
  ],
  accessoryMaterials: [
    { kind: 'label', id: catalogPartId('LABEL_POLY_12'), manufacturer: 'Tominal Demo Parts', partNumber: 'DEMO-LABEL-12', description: '12 mm polyester harness label' },
    { kind: 'tape', id: catalogPartId('TAPE_PVC_19'), manufacturer: 'Tominal Demo Parts', partNumber: 'DEMO-TAPE-PVC-19', description: '19 mm PVC harness tape', widthMm: mm(19), thicknessMm: mm(0.13) },
    { kind: 'sleeve', id: catalogPartId('SLEEVE_8'), manufacturer: 'Tominal Demo Parts', partNumber: 'DEMO-SLEEVE-8', description: '8 mm nominal braided sleeve', minBundleDiameterMm: mm(3), maxBundleDiameterMm: mm(7), nominalInnerDiameterMm: mm(8), wallThicknessMm: mm(0.4) },
    { kind: 'heatShrink', id: catalogPartId('HEATSHRINK_5_1P5'), manufacturer: 'Tominal Demo Parts', partNumber: 'DEMO-HS-5-1P5', description: '5 mm supplied / 1.5 mm recovered heat-shrink tubing', suppliedInnerDiameterMm: mm(5), recoveredInnerDiameterMm: mm(1.5) }
  ],
  studs: [{ id: studId('CHASSIS_STUD'), label: 'Chassis ground stud', size: 'M4' }]
});
