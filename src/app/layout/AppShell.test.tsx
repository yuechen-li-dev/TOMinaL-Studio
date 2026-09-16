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
});
