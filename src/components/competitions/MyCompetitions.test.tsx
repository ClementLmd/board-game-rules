import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyCompetitions from './MyCompetitions';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const baseProps = {
  userId: 'user-1',
  adminCompetitions: [],
  memberCompetitions: [],
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe('MyCompetitions', () => {
  describe('empty state', () => {
    it('shows empty state when no competitions', () => {
      render(<MyCompetitions {...baseProps} />);
      expect(screen.getByText(/vous n'avez pas encore de compétitions/i)).toBeInTheDocument();
    });

    it('shows a link to create a competition in empty state', () => {
      render(<MyCompetitions {...baseProps} />);
      const link = screen.getByRole('link', { name: /créez la vôtre/i });
      expect(link).toHaveAttribute('href', '/competitions/create/');
    });
  });

  describe('join by code form', () => {
    it('renders the code input and join button', () => {
      render(<MyCompetitions {...baseProps} />);
      expect(screen.getByPlaceholderText(/EX:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rejoindre/i })).toBeInTheDocument();
    });

    it('disables the join button when code is too short', () => {
      render(<MyCompetitions {...baseProps} />);
      const button = screen.getByRole('button', { name: /rejoindre/i });
      expect(button).toBeDisabled();
    });

    it('enables the join button once code has 6+ chars', async () => {
      const user = userEvent.setup();
      render(<MyCompetitions {...baseProps} />);
      await user.type(screen.getByPlaceholderText(/EX:/i), 'ABCDEF');
      expect(screen.getByRole('button', { name: /rejoindre/i })).not.toBeDisabled();
    });

    it('uppercases typed code', async () => {
      const user = userEvent.setup();
      render(<MyCompetitions {...baseProps} />);
      const input = screen.getByPlaceholderText(/EX:/i);
      await user.type(input, 'abcdef12');
      expect(input).toHaveValue('ABCDEF12');
    });

    it('pre-fills code from prefillCode prop', () => {
      render(<MyCompetitions {...baseProps} prefillCode="TESTCODE" />);
      expect(screen.getByPlaceholderText(/EX:/i)).toHaveValue('TESTCODE');
    });

    it('shows error message on failed join', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Code invalide.' }),
      });

      const user = userEvent.setup();
      render(<MyCompetitions {...baseProps} />);
      await user.type(screen.getByPlaceholderText(/EX:/i), 'BADCODE1');
      await user.click(screen.getByRole('button', { name: /rejoindre/i }));

      await waitFor(() => {
        expect(screen.getByText('Code invalide.')).toBeInTheDocument();
      });
    });

    it('shows success and appends comp on pending join', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'pending',
          competition_id: 'comp-99',
          competition_name: 'Super Comp',
        }),
      });

      const user = userEvent.setup();
      render(<MyCompetitions {...baseProps} />);
      await user.type(screen.getByPlaceholderText(/EX:/i), 'GOODCODE');
      await user.click(screen.getByRole('button', { name: /rejoindre/i }));

      await waitFor(() => {
        expect(screen.getByText(/demande envoyée pour "Super Comp"/i)).toBeInTheDocument();
      });
    });

    it('shows success and adds comp on direct accepted join', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'accepted',
          competition_id: 'comp-42',
          competition_name: 'Ma Comp',
        }),
      });

      const user = userEvent.setup();
      render(<MyCompetitions {...baseProps} />);
      await user.type(screen.getByPlaceholderText(/EX:/i), 'JOINCODE');
      await user.click(screen.getByRole('button', { name: /rejoindre/i }));

      await waitFor(() => {
        expect(screen.getByText(/vous avez rejoint "Ma Comp"/i)).toBeInTheDocument();
      });

      // Competition should appear in member list
      expect(screen.getByText('Ma Comp')).toBeInTheDocument();
    });

    it('clears the code input after a successful join', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'pending',
          competition_id: 'comp-1',
          competition_name: 'Test',
        }),
      });

      const user = userEvent.setup();
      render(<MyCompetitions {...baseProps} />);
      const input = screen.getByPlaceholderText(/EX:/i);
      await user.type(input, 'ABCDEF12');
      await user.click(screen.getByRole('button', { name: /rejoindre/i }));

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('competitions display', () => {
    it('shows admin competitions section', () => {
      render(
        <MyCompetitions
          {...baseProps}
          adminCompetitions={[
            { id: 'c1', name: 'Weekend Wonders', status: 'active', invite_code: 'ABC123', member_count: 5 },
          ]}
        />
      );
      expect(screen.getByText('Weekend Wonders')).toBeInTheDocument();
      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });

    it('shows manage link for admin competitions', () => {
      render(
        <MyCompetitions
          {...baseProps}
          adminCompetitions={[
            { id: 'c1', name: 'Test Comp', status: 'active', invite_code: 'XYZ', member_count: 2 },
          ]}
        />
      );
      const manageLink = screen.getByRole('link', { name: /gérer/i });
      expect(manageLink).toHaveAttribute('href', '/competitions/c1/manage/');
    });

    it('shows member competitions section', () => {
      render(
        <MyCompetitions
          {...baseProps}
          memberCompetitions={[
            { id: 'c2', name: 'Friends League', status: 'active', member_status: 'accepted', total_points: 42 },
          ]}
        />
      );
      expect(screen.getByText('Friends League')).toBeInTheDocument();
      expect(screen.getByText('42 pts')).toBeInTheDocument();
    });

    it('shows pending badge for awaiting membership', () => {
      render(
        <MyCompetitions
          {...baseProps}
          memberCompetitions={[
            { id: 'c3', name: 'Pending Comp', status: 'active', member_status: 'pending', total_points: 0 },
          ]}
        />
      );
      expect(screen.getByText(/en attente/i)).toBeInTheDocument();
    });

    it('does not show view link for pending members', () => {
      render(
        <MyCompetitions
          {...baseProps}
          memberCompetitions={[
            { id: 'c3', name: 'Pending Comp', status: 'active', member_status: 'pending', total_points: 0 },
          ]}
        />
      );
      expect(screen.queryByRole('link', { name: /voir/i })).not.toBeInTheDocument();
    });
  });
});
