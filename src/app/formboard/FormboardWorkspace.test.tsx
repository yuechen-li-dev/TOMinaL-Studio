// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { controllerChassisProject } from '../../../fixtures/controller-chassis/controllerChassis.formboard';
import { FormboardWorkspace } from './FormboardWorkspace';

describe('FormboardWorkspace', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the physical fixture and initiates deterministic SVG download', () => {
    const createObjectUrl = vi.fn((_blob: Blob) => 'blob:formboard');
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<FormboardWorkspace project={controllerChassisProject} />);

    expect(screen.getByText('1:1 Formboard')).toBeTruthy();
    expect(screen.getByText('Diagnostics').parentElement?.textContent).toContain('0');
    expect(screen.getByRole('button', { name: /ROUTE_MOTOR.*483\.6 mm.*WIRE_MOTOR_ENABLE/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'SVG' }));

    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(createObjectUrl.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:formboard');
  });

  it('fits the board with F unless focus is in an editable control', () => {
    render(<><input aria-label="Editable field" /><FormboardWorkspace project={controllerChassisProject} /></>);
    const board = screen.getByLabelText('1:1 harness formboard');
    const editable = screen.getByLabelText('Editable field');

    fireEvent.wheel(board, { deltaY: -1 });
    expect(board.getAttribute('viewBox')).not.toBe('0 0 900 600');

    fireEvent.keyDown(editable, { key: 'f' });
    expect(board.getAttribute('viewBox')).not.toBe('0 0 900 600');

    fireEvent.keyDown(window, { key: 'f' });
    expect(board.getAttribute('viewBox')).toBe('0 0 900 600');
  });

  it('creates and selects bounded route-station accessory intent', () => {
    render(<FormboardWorkspace project={controllerChassisProject} />);
    fireEvent.click(screen.getByRole('button', { name: /ROUTE_MOTOR.*483\.6 mm/ }));
    fireEvent.click(screen.getByRole('button', { name: '+ Label' }));
    expect(screen.getByRole('button', { name: 'LABEL_2label' })).toBeTruthy();
    expect(screen.getByText('label:LABEL_2')).toBeTruthy();
  });
});
