import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CatalogIdSelect, catalogSelectValueToId } from '@/components/CatalogIdSelect';

describe('catalogSelectValueToId', () => {
  it('returns undefined for an empty select value', () => {
    expect(catalogSelectValueToId('')).toBeUndefined();
  });

  it('returns id when option is selected', () => {
    expect(catalogSelectValueToId('WIRE-TXL')).toBe('WIRE-TXL');
  });
});

describe('CatalogIdSelect', () => {
  it('renders empty catalog message', () => {
    const markup = renderToStaticMarkup(
      <CatalogIdSelect currentValue={undefined} idLabel="wire types" onChange={vi.fn()} options={[]} placeholder="Unbound" />
    );

    expect(markup).toContain('No wire types');
  });

  it('renders missing current value as UNKNOWN option', () => {
    const markup = renderToStaticMarkup(
      <CatalogIdSelect
        currentValue="WIRE-404"
        idLabel="wire types"
        onChange={vi.fn()}
        options={[{ id: 'WIRE-TXL', label: 'TXL-20', secondary: '20 AWG' }]}
        placeholder="Unbound"
      />
    );

    expect(markup).toContain('UNKNOWN (WIRE-404) (missing)');
  });
});
