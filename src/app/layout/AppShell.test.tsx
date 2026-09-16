// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '@/app/App';
import { singleSelection } from '@/app/session/appSession';
import { getConductorRouteLength } from '@/formboard';
import { conductorId } from '@/harness-core';
import { WorkspaceInspector } from './WorkspaceInspector';
import { controllerChassisProject } from '../../../fixtures/controller-chassis/controllerChassis.formboard';

vi.mock('@/app/logical/LogicalWorkspace', () => ({
  default: ({ dispatch }: { dispatch: (command: unknown) => void }) => <button onClick={() => dispatch({ type: 'selection.set', selection: singleSelection({ kind: 'conductor', id: 'WIRE_MOTOR_POS' }) })}>Select motor conductor</button>
}));
vi.mock('@/app/formboard/FormboardWorkspace', () => ({
  FormboardWorkspace: ({ selection }: { selection: { primary?: { id: string } } }) => <div>Formboard selection: {selection.primary?.id ?? 'none'}</div>
}));
vi.mock('@/app/catalog/CatalogWorkspace', () => ({ default: () => <div>Catalog workspace ready</div> }));

afterEach(() => cleanup());

describe('engineering shell', () => {
  it('unmounts inactive workspaces and carries semantic selection between views', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Select motor conductor' }));
    expect(screen.getAllByText('WIRE_MOTOR_POS').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Formboard' }));
    expect(await screen.findByText('Formboard selection: WIRE_MOTOR_POS')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Select motor conductor' })).toBeNull();
  });

  it('supports entity-browser selection, inspector edits, catalog navigation, and command palette', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'WIRE_MOTOR_POS' }));
    const slack = screen.getByLabelText('Conductor slack');
    fireEvent.change(slack, { target: { value: '25' } });
    expect((screen.getByLabelText('Conductor slack') as HTMLInputElement).value).toBe('25');
    fireEvent.click(screen.getByRole('button', { name: 'Catalog' }));
    expect(await screen.findByText('Catalog workspace ready')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Commands/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Formboard' }));
    expect(await screen.findByText('Formboard selection: WIRE_MOTOR_POS')).toBeTruthy();
  });

  it('navigates a diagnostic to its useful workspace', async () => {
    const dispatch = vi.fn();
    render(<WorkspaceInspector project={controllerChassisProject} selection={{ entities: [] }} workspace="catalog" dispatch={dispatch} diagnostics={[{ id: 'route-problem', severity: 'error', rule: 'route.test', entity: { kind: 'routeSegment', id: 'SEG_MOTOR_OUT' }, message: 'Route problem' }]} />);
    fireEvent.click(screen.getByRole('button', { name: /route.test/ }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'workspace.switch', workspace: 'formboard' }));
  });

  it('shows the selected conductor physical route length from the public formboard selector', () => {
    const selectedConductorId = conductorId('WIRE_MOTOR_POS');
    const routeLength = getConductorRouteLength(
      controllerChassisProject.harness,
      controllerChassisProject.formboard,
      selectedConductorId
    );
    expect(routeLength.status).toBe('resolved');

    render(
      <WorkspaceInspector
        project={controllerChassisProject}
        selection={singleSelection({ kind: 'conductor', id: selectedConductorId })}
        workspace="logical"
        dispatch={vi.fn()}
        diagnostics={[]}
      />
    );

    const fieldLabel = screen.getByText('Route length');
    expect(fieldLabel.nextElementSibling?.textContent).toBe(
      routeLength.status === 'resolved' ? `${Number(routeLength.valueMm).toFixed(1)} mm` : 'Unresolved'
    );
  });

  it('shows affected semantic entities before a connector deletion can be applied', () => {
    const selection = singleSelection({ kind: 'connectorOccurrence', id: 'PANEL_MOTOR' });
    render(<WorkspaceInspector project={controllerChassisProject} selection={selection} workspace="logical" dispatch={vi.fn()} diagnostics={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review delete impact' }));
    expect(screen.getByText('Destructive edit plan')).toBeTruthy();
    expect(screen.getByText('conductor:WIRE_MOTOR_POS')).toBeTruthy();
  });

  it('keeps project open and save available in the browser build', async () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:project');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const inputClick = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    render(<App />);

    expect(screen.getByText('Browser · Unsaved project')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open Project' }));
    expect(inputClick).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Save Project' }));
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(await screen.findByText('Downloaded · controller-chassis.tominal.json')).toBeTruthy();

    createObjectUrl.mockRestore(); revokeObjectUrl.mockRestore(); anchorClick.mockRestore(); inputClick.mockRestore();
  });

  it('projects wires, BOM, quote, selection, refresh, and manufacturing exports without editable artifact state', async () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Wires' }));
    expect(await screen.findByText('Wire Cut List')).toBeTruthy();
    fireEvent.click(screen.getAllByText('WIRE_MOTOR_POS')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Formboard' }));
    expect(await screen.findByText('Formboard selection: WIRE_MOTOR_POS')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'BOM' }));
    expect(await screen.findByText('Bill of Materials')).toBeTruthy();
    expect(screen.getByText('DEMO-HOUSING-MOTOR-3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Quote' }));
    expect(await screen.findByText('Quote Snapshot')).toBeTruthy();
    expect(screen.getByText(/Demo Estimate \/ Local Fixture Pricing/)).toBeTruthy();
    const before = screen.getAllByText(/2026-09-15T12:00:00.000Z/).length;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh snapshot' }));
    expect(await screen.findAllByText(/2026-09-15T12:00:01.000Z/)).toHaveLength(before);

    fireEvent.click(screen.getByRole('button', { name: 'Manufacturing' }));
    expect(await screen.findByText('tominal.lock.toml')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Export All Artifacts' }));
    expect(click).toHaveBeenCalledTimes(8);
    createObjectUrl.mockRestore(); revokeObjectUrl.mockRestore(); click.mockRestore();
  });
});
