import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUpload from '../ImageUpload';
import { apiService } from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    uploadImage: jest.fn(),
  },
}));

const mockedApiService = apiService as jest.Mocked<typeof apiService>;

describe('ImageUpload Component', () => {
  const mockOnUploadSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnUploadSuccess.mockClear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders upload area with correct text', () => {
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    
    expect(screen.getByText('Click to select images or drag & drop')).toBeInTheDocument();
    expect(screen.getByText(/Supports JPEG, PNG, GIF, WebP/)).toBeInTheDocument();
    expect(screen.getByText('🔒 MIME Security')).toBeInTheDocument();
    expect(screen.getByText('📊 Metadata Extract')).toBeInTheDocument();
  });

  test('shows file input when upload area is clicked', async () => {
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    
    const uploadArea = screen.getByText('Click to select images or drag & drop').closest('div');
    expect(uploadArea).toBeInTheDocument();
    
    // Check that file input exists but is hidden
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveStyle('display: none');
  });

  test('handles successful file upload', async () => {
    mockedApiService.uploadImage.mockResolvedValueOnce({ 
      image_id: 1, 
      filename: 'test.jpg', 
      original_filename: 'test.jpg', 
      url: '/uploads/test.jpg' 
    });
    
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    
    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });
    });
    
    await waitFor(() => {
      expect(mockedApiService.uploadImage).toHaveBeenCalledWith(file);
    }, { timeout: 3000 });
    
    await waitFor(() => {
      expect(mockOnUploadSuccess).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    await waitFor(() => {
      expect(screen.getByText(/Successfully uploaded 1 image/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('handles upload failure', async () => {
    mockedApiService.uploadImage.mockRejectedValueOnce(new Error('Upload failed'));
    
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    
    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });
    });
    
    await waitFor(() => {
      expect(mockedApiService.uploadImage).toHaveBeenCalledWith(file);
    }, { timeout: 3000 });
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to upload 1 image/)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(mockOnUploadSuccess).not.toHaveBeenCalled();
  });

  test('validates file types', async () => {
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [invalidFile] }
      });
    });
    
    // Look for error message
    await waitFor(() => {
      expect(screen.getByText(/test\.txt: Unsupported file type/)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(mockedApiService.uploadImage).not.toHaveBeenCalled();
    expect(mockOnUploadSuccess).not.toHaveBeenCalled();
  });

  test('validates file size', async () => {
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Create a file larger than 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    
    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [largeFile] }
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText(/large\.jpg: File too large/)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(mockedApiService.uploadImage).not.toHaveBeenCalled();
    expect(mockOnUploadSuccess).not.toHaveBeenCalled();
  });

  test('handles multiple file uploads', async () => {
    mockedApiService.uploadImage
      .mockResolvedValueOnce({ 
        image_id: 1, 
        filename: 'test1.jpg', 
        original_filename: 'test1.jpg', 
        url: '/uploads/test1.jpg' 
      })
      .mockResolvedValueOnce({ 
        image_id: 2, 
        filename: 'test2.png', 
        original_filename: 'test2.png', 
        url: '/uploads/test2.png' 
      });
    
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['test image 1'], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test image 2'], 'test2.png', { type: 'image/png' });
    
    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [file1, file2] }
      });
    });
    
    await waitFor(() => {
      expect(mockedApiService.uploadImage).toHaveBeenCalledTimes(2);
    }, { timeout: 3000 });
    
    await waitFor(() => {
      expect(screen.getByText(/Successfully uploaded 2 images/)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(mockOnUploadSuccess).toHaveBeenCalled();
  });

  test('shows drag over state', () => {
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    
    const uploadArea = screen.getByText('Click to select images or drag & drop').closest('div');
    
    // Simulate drag over
    fireEvent.dragOver(uploadArea!, {
      dataTransfer: { files: [] }
    });
    
    expect(screen.getByText('Drop your images here!')).toBeInTheDocument();
    expect(screen.getByText('Release to upload your beautiful images')).toBeInTheDocument();
  });

  test('handles drag and drop', async () => {
    mockedApiService.uploadImage.mockResolvedValueOnce({ 
      image_id: 1, 
      filename: 'test.jpg', 
      original_filename: 'test.jpg', 
      url: '/uploads/test.jpg' 
    });
    
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    
    const uploadArea = screen.getByText('Click to select images or drag & drop').closest('div');
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    
    // Simulate drag over first
    fireEvent.dragOver(uploadArea!, {
      dataTransfer: { files: [file] }
    });
    
    // Then drop
    fireEvent.drop(uploadArea!, {
      dataTransfer: { files: [file] }
    });
    
    await waitFor(() => {
      expect(mockedApiService.uploadImage).toHaveBeenCalledWith(file);
    }, { timeout: 3000 });
    
    await waitFor(() => {
      expect(mockOnUploadSuccess).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test('shows uploading state with progress', async () => {
    // Mock a slow upload to see the uploading state
    mockedApiService.uploadImage.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ 
        image_id: 1, 
        filename: 'test.jpg', 
        original_filename: 'test.jpg', 
        url: '/uploads/test.jpg' 
      }), 100))
    );
    
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    
    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });
    });
    
    // Should show uploading state
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
    expect(screen.getByText('🔒 Performing MIME validation and security checks...')).toBeInTheDocument();
    expect(screen.getByText('📄 test.jpg')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockOnUploadSuccess).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test('message disappears after timeout', async () => {
    jest.useFakeTimers();
    
    mockedApiService.uploadImage.mockResolvedValueOnce({ 
      image_id: 1, 
      filename: 'test.jpg', 
      original_filename: 'test.jpg', 
      url: '/uploads/test.jpg' 
    });
    
    render(<ImageUpload onUploadSuccess={mockOnUploadSuccess} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    
    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });
    });
    
    // Wait for success message to appear
    await waitFor(() => {
      expect(screen.getByText(/Successfully uploaded 1 image/)).toBeInTheDocument();
    });
    
    // Fast forward timers
    act(() => {
      jest.advanceTimersByTime(4500);
    });
    
    // Check that message is gone
    expect(screen.queryByText(/Successfully uploaded 1 image/)).not.toBeInTheDocument();
    
    jest.useRealTimers();
  });
}); 