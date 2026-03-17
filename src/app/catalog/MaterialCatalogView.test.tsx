// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(() => {
  cleanup();
});

import { MaterialCatalogView } from '@/app/catalog/MaterialCatalogView';

function getSection(title: string): HTMLElement {
  const heading = screen.getByRole('heading', { name: title });
  const section = heading.closest('section');

  if (!section) {
    throw new Error(`Section not found for ${title}`);
  }

  return section;
}

describe('MaterialCatalogView collapsed catalog forms', () => {
  it('hides each top-level add form by default', () => {
    render(<MaterialCatalogView />);

    expect(screen.getByRole('button', { name: 'New Housing' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New Ring Terminal' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New Wire Type' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New Accessory' })).toBeTruthy();

    expect(screen.queryByRole('button', { name: 'Add Housing' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add Ring Terminal' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add Wire Type' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add Accessory' })).toBeNull();
  });

  it('shows a section form when clicking New action', () => {
    render(<MaterialCatalogView />);

    const wireSection = getSection('Wire Types');
    fireEvent.click(within(wireSection).getByRole('button', { name: 'New Wire Type' }));

    expect(within(wireSection).getByRole('button', { name: 'Add Wire Type' })).toBeTruthy();
    expect(within(wireSection).queryByRole('button', { name: 'New Wire Type' })).toBeNull();
  });

  it('collapses a form after a successful add', () => {
    render(<MaterialCatalogView />);

    const accessorySection = getSection('Accessory Materials');
    fireEvent.click(within(accessorySection).getByRole('button', { name: 'New Accessory' }));

    fireEvent.change(within(accessorySection).getByLabelText('ID'), { target: { value: 'ACC-1' } });
    fireEvent.change(within(accessorySection).getByLabelText('Part Number'), { target: { value: 'PN-ACC-1' } });
    fireEvent.change(within(accessorySection).getByLabelText('Manufacturer'), { target: { value: 'ACME' } });
    fireEvent.change(within(accessorySection).getByLabelText('Description'), { target: { value: 'Adhesive Loom Tape' } });
    fireEvent.change(within(accessorySection).getByLabelText('Category'), { target: { value: 'Tape' } });

    fireEvent.click(within(accessorySection).getByRole('button', { name: 'Add Accessory' }));

    expect(within(accessorySection).queryByRole('button', { name: 'Add Accessory' })).toBeNull();
    expect(within(accessorySection).getByRole('button', { name: 'New Accessory' })).toBeTruthy();
    expect(within(accessorySection).getByText('ACC-1')).toBeTruthy();
  });

  it('reveals the form when entering edit mode', () => {
    render(<MaterialCatalogView />);

    const ringSection = getSection('Ring Terminals');
    fireEvent.click(within(ringSection).getByRole('button', { name: 'New Ring Terminal' }));

    fireEvent.change(within(ringSection).getByLabelText('ID'), { target: { value: 'RING-1' } });
    fireEvent.change(within(ringSection).getByLabelText('Part Number'), { target: { value: 'PN-RING-1' } });
    fireEvent.change(within(ringSection).getByLabelText('Manufacturer'), { target: { value: 'TE' } });
    fireEvent.change(within(ringSection).getByLabelText('Description'), { target: { value: '3/8 Ring Terminal' } });
    fireEvent.change(within(ringSection).getByLabelText('Compatible Wire Gauge'), { target: { value: '18 AWG' } });
    fireEvent.change(within(ringSection).getByLabelText('Crimp Tool Part Number'), { target: { value: 'CT-100' } });
    fireEvent.change(within(ringSection).getByLabelText('Stud Size'), { target: { value: '3/8' } });

    fireEvent.click(within(ringSection).getByRole('button', { name: 'Add Ring Terminal' }));
    expect(within(ringSection).queryByRole('button', { name: 'Add Ring Terminal' })).toBeNull();

    fireEvent.click(within(ringSection).getByRole('button', { name: 'Edit' }));

    expect(within(ringSection).getByRole('button', { name: 'Update Ring Terminal' })).toBeTruthy();
    expect(within(ringSection).getByDisplayValue('RING-1')).toBeTruthy();
  });
});
