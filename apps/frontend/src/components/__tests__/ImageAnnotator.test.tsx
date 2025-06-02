import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageAnnotator from '../ImageAnnotator';
import { ImageInfo } from '../../types';
import { apiService } from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    getAnnotations: jest.fn(),
    saveAnnotations: jest.fn(),
    downloadAnnotations: jest.fn(),
    getImageUrl: jest.fn((url) => `http://localhost:5000${url}`),
  },
}));

const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock fetch for COCO download
global.fetch = jest.fn();

// Mock window.alert
global.alert = jest.fn();

// Mock window.confirm
global.confirm = jest.fn();

describe('ImageAnnotator Component', () => {
  const mockOnClose = jest.fn();
  
  const mockImage: ImageInfo = {
    id: 1,
    filename: 'test.jpg',
    original_filename: 'test.jpg',
    file_path: '/uploads/test.jpg',
    url: '/uploads/test.jpg',
    upload_time: '2024-01-01T00:00:00Z',
    width: 800,
    height: 600
  };

  // Store original DOM methods
  let originalCreateElement: typeof document.createElement;
  let originalAppendChild: typeof document.body.appendChild;
  let originalRemoveChild: typeof document.body.removeChild;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  // Setup before each test
  beforeEach(() => {
    // Store originals
    originalCreateElement = document.createElement;
    originalAppendChild = document.body.appendChild;
    originalRemoveChild = document.body.removeChild;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    jest.clearAllMocks();
    mockOnClose.mockClear();
    mockedApiService.getAnnotations.mockResolvedValue([]);
    (global.alert as jest.Mock).mockClear();
    (global.confirm as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  // Cleanup after each test
  afterEach(() => {
    // Restore original methods
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    
    cleanup();
    jest.clearAllTimers();
    
    // Clear any remaining DOM elements
    document.body.innerHTML = '';
  });

  test('renders annotator with image filename', async () => {
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    expect(screen.getByText('test.jpg')).toBeInTheDocument();
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  test('loads annotations on mount', async () => {
    const mockAnnotations = [
      {
        type: 'box' as const,
        x: 10,
        y: 10,
        w: 50,
        h: 50,
        id: '1',
        label: 'Test Box'
      }
    ];
    
    mockedApiService.getAnnotations.mockResolvedValueOnce(mockAnnotations);
    
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    await waitFor(() => {
      expect(mockedApiService.getAnnotations).toHaveBeenCalledWith(1);
    });
  });

  test('renders drawing tools', async () => {
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    expect(screen.getByText('📦 Draw Box')).toBeInTheDocument();
    expect(screen.getByText('🔷 Draw Polygon')).toBeInTheDocument();
    expect(screen.getByText('↶ Undo')).toBeInTheDocument();
    expect(screen.getByText('↷ Redo')).toBeInTheDocument();
  });

  test('enables box drawing mode', async () => {
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    const boxButton = screen.getByText('📦 Draw Box');
    
    await act(async () => {
      fireEvent.click(boxButton);
    });
    
    // Use partial text matching for text that might be split across elements
    expect(screen.getByText(/Click and drag to draw a box/i)).toBeInTheDocument();
  });

  test('enables polygon drawing mode', async () => {
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    const polygonButton = screen.getByText('🔷 Draw Polygon');
    
    await act(async () => {
      fireEvent.click(polygonButton);
    });
    
    // Use partial text matching
    expect(screen.getByText(/Click to add points/i)).toBeInTheDocument();
  });

  test('shows save and download buttons', async () => {
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    expect(screen.getByText('💾 Save')).toBeInTheDocument();
    expect(screen.getByText('📥 JSON')).toBeInTheDocument();
    expect(screen.getByText('📥 COCO')).toBeInTheDocument();
  });

  test('handles save annotations', async () => {
    mockedApiService.saveAnnotations.mockResolvedValueOnce(undefined);
    
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    const saveButton = screen.getByText('💾 Save');
    
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    await waitFor(() => {
      expect(mockedApiService.saveAnnotations).toHaveBeenCalledWith(1, []);
    });
    
    expect(global.alert).toHaveBeenCalledWith('Annotations saved successfully!');
  });

  test('handles save annotations error', async () => {
    mockedApiService.saveAnnotations.mockRejectedValueOnce(new Error('Save failed'));
    
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    const saveButton = screen.getByText('💾 Save');
    
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    await waitFor(() => {
      expect(mockedApiService.saveAnnotations).toHaveBeenCalledWith(1, []);
    });
    
    expect(global.alert).toHaveBeenCalledWith('Failed to save annotations');
  });

  test('handles JSON download', async () => {
    mockedApiService.downloadAnnotations.mockResolvedValueOnce(undefined);
    
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    const jsonButton = screen.getByText('📥 JSON');
    
    await act(async () => {
      fireEvent.click(jsonButton);
    });
    
    await waitFor(() => {
      expect(mockedApiService.downloadAnnotations).toHaveBeenCalledWith(1);
    });
  });

  test('handles COCO download', async () => {
    const mockBlob = new Blob(['coco data'], { type: 'application/json' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob)
    });
    
    // First render the component
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    // Get the button first, before mocking DOM methods
    const cocoButton = screen.getByText('📥 COCO');
    
    // Now mock DOM methods after render
    const mockUrl = 'blob:mock-url';
    URL.createObjectURL = jest.fn(() => mockUrl);
    URL.revokeObjectURL = jest.fn();
    
    const mockElement = {
      href: '',
      download: '',
      click: jest.fn(),
      style: {}
    };
    
    document.createElement = jest.fn(() => mockElement as any);
    document.body.appendChild = jest.fn(() => mockElement as any);
    document.body.removeChild = jest.fn(() => mockElement as any);
    
    // Click the button
    await act(async () => {
      fireEvent.click(cocoButton);
    });
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/images/1/download-annotations?format=coco');
    });
  });

  test('shows clear all button and handles confirmation', async () => {
    (global.confirm as jest.Mock).mockReturnValue(true);
    
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    const clearButton = screen.getByText('🗑️ Clear All');
    
    await act(async () => {
      fireEvent.click(clearButton);
    });
    
    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to clear all annotations?');
  });

  test('closes annotator when close button is clicked', async () => {
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    const closeButton = screen.getByText('✕');
    
    await act(async () => {
      fireEvent.click(closeButton);
    });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('shows keyboard shortcuts help', async () => {
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    expect(screen.getByText(/Shortcuts:/)).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\+Z \(Undo\)/)).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\+Shift\+Z \(Redo\)/)).toBeInTheDocument();
  });

  test('shows annotation count', async () => {
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    expect(screen.getByText(/Annotations: 0/)).toBeInTheDocument();
  });

  test('shows loading state initially', async () => {
    await act(async () => {
      render(<ImageAnnotator image={mockImage} onClose={mockOnClose} />);
    });
    
    expect(screen.getByText('Loading image...')).toBeInTheDocument();
  });
}); 