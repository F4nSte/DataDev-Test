import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageList from '../ImageList';
import { ImageInfo } from '../../types';
import { apiService } from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    getImageUrl: jest.fn((url) => `http://localhost:5000${url}`),
  },
}));

const mockedApiService = apiService as jest.Mocked<typeof apiService>;

describe('ImageList Component', () => {
  const mockOnImageSelect = jest.fn();
  
  const mockImages: ImageInfo[] = [
    {
      id: 1,
      filename: 'test1.jpg',
      original_filename: 'test1.jpg',
      file_path: '/uploads/test1.jpg',
      url: '/uploads/test1.jpg',
      upload_time: '2024-01-01T00:00:00Z',
      width: 800,
      height: 600
    },
    {
      id: 2,
      filename: 'test2.png',
      original_filename: 'test2.png',
      file_path: '/uploads/test2.png',
      url: '/uploads/test2.png',
      upload_time: '2024-01-02T00:00:00Z',
      width: 1024,
      height: 768
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnImageSelect.mockClear();
  });

  test('renders empty state when no images', () => {
    render(<ImageList images={[]} onImageSelect={mockOnImageSelect} />);
    
    expect(screen.getByText('No images uploaded yet')).toBeInTheDocument();
    expect(screen.getByText('Upload some images to start annotating')).toBeInTheDocument();
  });

  test('renders images grid when images are provided', () => {
    render(<ImageList images={mockImages} onImageSelect={mockOnImageSelect} />);
    
    expect(screen.getByText('test1.jpg')).toBeInTheDocument();
    expect(screen.getByText('test2.png')).toBeInTheDocument();
    expect(screen.getByText('800 × 600')).toBeInTheDocument();
    expect(screen.getByText('1024 × 768')).toBeInTheDocument();
    expect(screen.getByText(/Images \(2\)/)).toBeInTheDocument();
  });

  test('handles image selection', () => {
    render(<ImageList images={mockImages} onImageSelect={mockOnImageSelect} />);
    
    const firstImage = screen.getByText('test1.jpg').closest('.image-card');
    fireEvent.click(firstImage!);
    
    expect(mockOnImageSelect).toHaveBeenCalledWith(mockImages[0]);
  });

  test('shows selected state for selected image', () => {
    render(<ImageList images={mockImages} onImageSelect={mockOnImageSelect} selectedImageId={1} />);
    
    const selectedCard = screen.getByText('test1.jpg').closest('.image-card');
    expect(selectedCard).toHaveClass('selected');
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  test('formats upload dates correctly', () => {
    render(<ImageList images={mockImages} onImageSelect={mockOnImageSelect} />);
    
    expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/1\/2\/2024/)).toBeInTheDocument();
  });

  test('shows processed badge for images with dimensions', () => {
    render(<ImageList images={mockImages} onImageSelect={mockOnImageSelect} />);
    
    expect(screen.getByText(/2 processed/)).toBeInTheDocument();
    expect(screen.getAllByText('✓ Processed')).toHaveLength(2);
  });

  test('handles images without dimensions', () => {
    const imagesWithoutDimensions: ImageInfo[] = [
      {
        id: 3,
        filename: 'test3.jpg',
        original_filename: 'test3.jpg',
        file_path: '/uploads/test3.jpg',
        url: '/uploads/test3.jpg',
        upload_time: '2024-01-03T00:00:00Z'
      }
    ];
    
    render(<ImageList images={imagesWithoutDimensions} onImageSelect={mockOnImageSelect} />);
    
    expect(screen.getByText('test3.jpg')).toBeInTheDocument();
    expect(screen.getByText(/0 processed/)).toBeInTheDocument();
    expect(screen.queryByText('✓ Processed')).not.toBeInTheDocument();
  });

  test('uses correct image URLs', () => {
    render(<ImageList images={mockImages} onImageSelect={mockOnImageSelect} />);
    
    expect(mockedApiService.getImageUrl).toHaveBeenCalledWith('/uploads/test1.jpg');
    expect(mockedApiService.getImageUrl).toHaveBeenCalledWith('/uploads/test2.png');
  });
}); 