import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleConfigV2 } from './RoleConfigV2';

function getStartButton(container: HTMLElement) {
  return within(container).getAllByRole('button', { name: /Commencer la partie/ })[0];
}

describe('RoleConfigV2', () => {
  it('renders with default loup-garou count for 8 players', () => {
    const { container } = render(<RoleConfigV2 playerCount={8} onStart={() => {}} />);
    const loupGarouRow = within(container).getAllByText('Les Loups-Garous')[0].closest('div');
    expect(loupGarouRow).toBeInTheDocument();
    expect(within(container).getByText('2', { selector: '.w-5' })).toBeInTheDocument();
  });

  it('start button is enabled when config is valid', () => {
    const { container } = render(<RoleConfigV2 playerCount={6} onStart={() => {}} />);
    const startBtn = getStartButton(container);
    expect(startBtn).not.toBeDisabled();
  });

  it('calls onStart with config including villageois', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const { container } = render(<RoleConfigV2 playerCount={6} onStart={onStart} />);
    await user.click(getStartButton(container));
    expect(onStart).toHaveBeenCalledTimes(1);
    const config = onStart.mock.calls[0][0];
    expect(config).toHaveProperty('villageois');
    expect(config.villageois).toBeGreaterThanOrEqual(0);
    expect(config['loup-garou']).toBe(2); // max(2, floor(6/4))
  });

  it('unique roles are capped at 1', async () => {
    const user = userEvent.setup();
    const { container } = render(<RoleConfigV2 playerCount={8} onStart={() => {}} />);
    const addVoyante = within(container).getAllByLabelText('Ajouter La Voyante')[0];
    await user.click(addVoyante);
    // Voyante is unique: count should be 1, add button disabled
    expect(within(container).getAllByLabelText('Ajouter La Voyante')[0]).toBeDisabled();
  });

  it('minus button decreases count', async () => {
    const user = userEvent.setup();
    const { container } = render(<RoleConfigV2 playerCount={8} onStart={() => {}} />);
    const removeLoup = within(container).getAllByLabelText('Retirer Les Loups-Garous')[0];
    await user.click(removeLoup);
    await user.click(removeLoup);
    // Started at 2, after 2 clicks should be 0
    const countDisplays = within(container).getAllByText('0', { selector: '.w-5' });
    expect(countDisplays.length).toBeGreaterThan(0);
  });
});
