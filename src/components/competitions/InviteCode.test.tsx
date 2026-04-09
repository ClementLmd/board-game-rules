import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InviteCode from './InviteCode';

// Mock window.location.origin (jsdom default is 'http://localhost')
Object.defineProperty(window, 'location', {
  value: { origin: 'https://example.com' },
  configurable: true,
});

// jsdom has no clipboard API — define a stub so vi.spyOn can work
const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: clipboardWriteText },
  configurable: true,
  writable: true,
});

// ---------------------------------------------------------------------------
// Supabase mock — uses vi.fn() so individual tests can override return values
// ---------------------------------------------------------------------------
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();

vi.mock('../../lib/supabase-browser', () => ({
  getSupabaseBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: mockMaybeSingle }),
          maybeSingle: mockMaybeSingle,
        }),
      }),
      insert: mockInsert,
    }),
  }),
}));

const baseProps = {
  competitionId: 'comp-1',
  code: 'ABCD1234',
};

beforeEach(() => {
  mockMaybeSingle.mockReset();
  mockInsert.mockReset();
  // Default: user found, no existing membership
  mockMaybeSingle
    .mockResolvedValueOnce({ data: { id: 'user-found', username: 'alice' } }) // profile lookup
    .mockResolvedValueOnce({ data: null }); // membership check
  mockInsert.mockResolvedValue({ error: null });
});

describe('InviteCode', () => {
  describe('code display', () => {
    it('renders the invite code', () => {
      render(<InviteCode {...baseProps} />);
      expect(screen.getByText('ABCD1234')).toBeInTheDocument();
    });

    it('renders a dash when code is null', () => {
      render(<InviteCode competitionId="comp-1" code={null} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('copy buttons', () => {
    beforeEach(() => {
      clipboardWriteText.mockClear();
    });

    it('copies the code to clipboard when clicking Code button', async () => {
      render(<InviteCode {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /^code$/i }));
      await waitFor(() => {
        expect(clipboardWriteText).toHaveBeenCalledWith('ABCD1234');
      });
    });

    it('shows "Copié !" feedback after copying', async () => {
      render(<InviteCode {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /^code$/i }));
      await waitFor(() => {
        expect(screen.getByText(/copié/i)).toBeInTheDocument();
      });
    });

    it('copies the full link when clicking Lien button', async () => {
      render(<InviteCode {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /lien/i }));
      await waitFor(() => {
        expect(clipboardWriteText).toHaveBeenCalledWith(
          'https://example.com/competitions/?code=ABCD1234'
        );
      });
    });
  });

  describe('invite by username', () => {
    it('renders the invite input', () => {
      render(<InviteCode {...baseProps} />);
      expect(screen.getByPlaceholderText(/pseudo du joueur/i)).toBeInTheDocument();
    });

    it('disables invite button when input is empty', () => {
      render(<InviteCode {...baseProps} />);
      expect(screen.getByRole('button', { name: /^inviter$/i })).toBeDisabled();
    });

    it('enables invite button when username is typed', async () => {
      const user = userEvent.setup({ writeToClipboard: false });
      render(<InviteCode {...baseProps} />);
      await user.type(screen.getByPlaceholderText(/pseudo du joueur/i), 'alice');
      expect(screen.getByRole('button', { name: /^inviter$/i })).not.toBeDisabled();
    });

    it('shows success message after inviting a known user', async () => {
      const user = userEvent.setup({ writeToClipboard: false });
      render(<InviteCode {...baseProps} />);
      await user.type(screen.getByPlaceholderText(/pseudo du joueur/i), 'alice');
      await user.click(screen.getByRole('button', { name: /^inviter$/i }));

      await waitFor(() => {
        expect(screen.getByText(/alice a été ajouté/i)).toBeInTheDocument();
      });
    });

    it('clears input after successful invite', async () => {
      const user = userEvent.setup({ writeToClipboard: false });
      render(<InviteCode {...baseProps} />);
      const input = screen.getByPlaceholderText(/pseudo du joueur/i);
      await user.type(input, 'alice');
      await user.click(screen.getByRole('button', { name: /^inviter$/i }));

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('shows error when username is not found', async () => {
      // Override: profile not found
      mockMaybeSingle.mockReset();
      mockMaybeSingle.mockResolvedValue({ data: null });

      const user = userEvent.setup({ writeToClipboard: false });
      render(<InviteCode {...baseProps} />);
      await user.type(screen.getByPlaceholderText(/pseudo du joueur/i), 'nobody');
      await user.click(screen.getByRole('button', { name: /^inviter$/i }));

      await waitFor(() => {
        expect(screen.getByText(/introuvable/i)).toBeInTheDocument();
      });
    });

    it('shows error when user is already a member', async () => {
      // Override: profile found, membership already exists
      mockMaybeSingle.mockReset();
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { id: 'user-found', username: 'alice' } })
        .mockResolvedValueOnce({ data: { status: 'accepted' } });

      const user = userEvent.setup({ writeToClipboard: false });
      render(<InviteCode {...baseProps} />);
      await user.type(screen.getByPlaceholderText(/pseudo du joueur/i), 'alice');
      await user.click(screen.getByRole('button', { name: /^inviter$/i }));

      await waitFor(() => {
        expect(screen.getByText(/déjà dans la compétition/i)).toBeInTheDocument();
      });
    });
  });
});
