import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameSetupV2 } from './GameSetupV2';

describe('GameSetupV2', () => {
  it('renders default 6 player input slots', () => {
    render(<GameSetupV2 onStart={() => {}} />);
    const inputs = screen.getAllByPlaceholderText(/Joueur \d/);
    expect(inputs).toHaveLength(6);
  });

  it('adds a slot when "Ajouter un joueur" is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<GameSetupV2 onStart={() => {}} />);
    const addBtn = within(container).getAllByText('Ajouter un joueur')[0];
    await user.click(addBtn);
    const inputs = within(container).getAllByPlaceholderText(/Joueur \d/);
    expect(inputs).toHaveLength(7);
  });

  it('removes a slot when delete is clicked (down to 5)', async () => {
    const user = userEvent.setup();
    const { container } = render(<GameSetupV2 onStart={() => {}} />);
    const addBtn = within(container).getAllByText('Ajouter un joueur')[0];
    await user.click(addBtn);
    const removeButtons = within(container).getAllByLabelText(/Supprimer joueur/);
    await user.click(removeButtons[0]);
    const inputs = within(container).getAllByPlaceholderText(/Joueur \d/);
    expect(inputs).toHaveLength(6);
  });

  it('start button is disabled when names are empty', () => {
    const onStart = vi.fn();
    const { container } = render(<GameSetupV2 onStart={onStart} />);
    const startBtn = within(container).getAllByText('Commencer la nuit')[0];
    expect(startBtn).toBeDisabled();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('shows error when names are duplicated', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const { container } = render(<GameSetupV2 onStart={onStart} />);
    const inputs = within(container).getAllByPlaceholderText(/Joueur \d/);
    await user.type(inputs[0], 'Alice');
    await user.type(inputs[1], 'Alice');
    await user.type(inputs[2], 'Bob');
    await user.type(inputs[3], 'Carol');
    await user.type(inputs[4], 'Dave');
    await user.type(inputs[5], 'Eve');
    const startBtn = within(container).getAllByText('Commencer la nuit')[0];
    await user.click(startBtn);
    expect(screen.getByText('Les noms doivent être uniques.')).toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('calls onStart with correct players on valid submit', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const { container } = render(<GameSetupV2 onStart={onStart} />);
    const inputs = within(container).getAllByPlaceholderText(/Joueur \d/);
    await user.type(inputs[0], 'Alice');
    await user.type(inputs[1], 'Bob');
    await user.type(inputs[2], 'Carol');
    await user.type(inputs[3], 'Dave');
    await user.type(inputs[4], 'Eve');
    await user.type(inputs[5], 'Frank');
    const startBtn = within(container).getAllByText('Commencer la nuit')[0];
    await user.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
    const players = onStart.mock.calls[0][0];
    expect(players).toHaveLength(6);
    expect(players[0]).toMatchObject({ id: 1, name: 'Alice', isAlive: true });
    expect(players[5]).toMatchObject({ id: 6, name: 'Frank', isAlive: true });
  });
});
