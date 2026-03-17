import { describe, expect, it } from 'vitest';

import { emptyMaterialCatalogData } from '@/catalog/catalogData';
import { exportCatalogToToml, importCatalogAdditive } from '@/catalog/catalogManifestCodec';

const sampleCatalog = {
  connectorHousings: [
    {
      id: 'dt04_2p',
      partNumber: 'DT04-2P',
      manufacturer: 'TE',
      description: '2-way housing',
      family: 'Deutsch DT',
      cavityCount: 2,
      notes: '',
      terminals: [
        {
          id: 'dt_pin_16',
          partNumber: '0462-201-16141',
          description: 'Size 16 pin',
          compatibleWireGauge: '16-18 AWG',
          crimpToolPartNumber: 'HDT-48-00',
          notes: ''
        }
      ],
      seals: [
        {
          id: 'dt_seal_green',
          partNumber: 'W12S',
          description: 'Green wire seal',
          notes: ''
        }
      ],
      plugs: [
        {
          id: 'dt_plug_2',
          partNumber: '114017',
          description: 'Cavity plug',
          notes: ''
        }
      ]
    }
  ],
  ringTerminals: [
    {
      id: 'ring_m6_18awg',
      partNumber: 'RING-M6-18',
      manufacturer: 'TE',
      description: 'M6 ring',
      compatibleWireGauge: '18 AWG',
      crimpToolPartNumber: 'TOOL-1',
      studSize: 'M6',
      notes: ''
    }
  ],
  wireTypes: [
    {
      id: 'txl_18awg',
      partNumber: 'TXL-18-BLK',
      manufacturer: 'GXL',
      description: 'TXL wire',
      gauge: '18 AWG',
      insulationType: 'TXL',
      notes: ''
    }
  ],
  accessoryMaterials: [
    {
      id: 'tape_19mm',
      partNumber: 'TAPE-19',
      manufacturer: '3M',
      description: 'Cloth tape',
      category: 'tape',
      notes: ''
    }
  ]
};

describe('catalogManifestCodec', () => {
  it('exports catalog TOML with expected sections', () => {
    const toml = exportCatalogToToml(sampleCatalog);

    expect(toml).toContain('[[connector_housings]]');
    expect(toml).toContain('[[ring_terminals]]');
    expect(toml).toContain('[[wire_types]]');
    expect(toml).toContain('[[accessory_materials]]');
  });

  it('imports valid manifest into empty catalog', () => {
    const toml = exportCatalogToToml(sampleCatalog);
    const result = importCatalogAdditive(emptyMaterialCatalogData, toml);

    expect(result.catalog).toEqual(sampleCatalog);
    expect(result.summary).toMatchObject({ added: 4, skippedDuplicates: 0, invalid: 0 });
  });

  it('imports valid manifest additively into non-empty catalog', () => {
    const existing = {
      ...emptyMaterialCatalogData,
      wireTypes: [
        {
          id: 'txl_20awg',
          partNumber: 'TXL-20-RED',
          manufacturer: 'GXL',
          description: 'TXL wire 20',
          gauge: '20 AWG',
          insulationType: 'TXL',
          notes: ''
        }
      ]
    };

    const toml = exportCatalogToToml(sampleCatalog);
    const result = importCatalogAdditive(existing, toml);

    expect(result.catalog.wireTypes.map((item) => item.id)).toEqual(['txl_20awg', 'txl_18awg']);
    expect(result.summary.added).toBe(4);
  });

  it('skips duplicate ids without overwriting and skips duplicate housing wholesale', () => {
    const existing = {
      ...sampleCatalog,
      connectorHousings: [
        {
          ...sampleCatalog.connectorHousings[0],
          description: 'existing description',
          terminals: [],
          seals: [],
          plugs: []
        }
      ]
    };

    const toml = exportCatalogToToml(sampleCatalog);
    const result = importCatalogAdditive(existing, toml);

    expect(result.catalog.connectorHousings[0].description).toBe('existing description');
    expect(result.catalog.connectorHousings[0].terminals).toEqual([]);
    expect(result.summary.sections.connectorHousings.skippedDuplicates).toBe(1);
    expect(result.summary.skippedDuplicates).toBe(4);
  });

  it('does not mutate catalog when manifest validation fails', () => {
    const existing = { ...sampleCatalog };
    const invalidToml = `[[wire_types]]\nid = "bad"\npart_number = "bad-part"\nmanufacturer = "MFG"\ndescription = "wire"\ngauge = "18 AWG"\ninsulation_type = "TXL"\n`;

    expect(() => importCatalogAdditive(existing, invalidToml)).toThrow();
    expect(existing).toEqual(sampleCatalog);
  });
});
