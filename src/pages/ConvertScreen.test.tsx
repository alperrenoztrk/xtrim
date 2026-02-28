import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConvertScreen from './ConvertScreen';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

const renderScreen = () =>
  render(
    <MemoryRouter>
      <ConvertScreen />
    </MemoryRouter>
  );

describe('ConvertScreen OCR flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('uses OCR API for compatible image files and downloads extracted text', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ParsedResults: [{ ParsedText: 'Hello World' }],
      }),
    } as Response);

    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /Dosya → OCR/i }));

    const input = screen.getByLabelText(/Dosya seçin/i);
    fireEvent.change(input, {
      target: {
        files: [new File(['img'], 'scan.png', { type: 'image/png' })],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Dönüştür ve indir/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('OCR completed. Text file downloaded.');
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  it('falls back to local text extraction for unsupported OCR API file extensions', async () => {
    const fetchMock = vi.spyOn(global, 'fetch');

    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /Dosya → OCR/i }));

    const input = screen.getByLabelText(/Dosya seçin/i);
    fireEvent.change(input, {
      target: {
        files: [new File(['Lokal metin'], 'notes.txt', { type: 'text/plain' })],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Dönüştür ve indir/i }));

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('OCR completed. Text file downloaded.');
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  it('shows warning when OCR result is empty', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ParsedResults: [{ ParsedText: '   ' }],
      }),
    } as Response);

    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /Dosya → OCR/i }));

    const input = screen.getByLabelText(/Dosya seçin/i);
    fireEvent.change(input, {
      target: {
        files: [new File(['img'], 'blank.png', { type: 'image/png' })],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Dönüştür ve indir/i }));

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith('No readable text found in the file.');
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });
  });
});
