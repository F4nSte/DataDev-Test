import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders image annotation tool header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Image Annotation Tool/i);
  expect(headerElement).toBeInTheDocument();
});

test('renders upload section', () => {
  render(<App />);
  const uploadText = screen.getByText(/Click to select images or drag & drop/i);
  expect(uploadText).toBeInTheDocument();
});

test('renders loading state initially', () => {
  render(<App />);
  const loadingText = screen.getByText(/Loading images.../i);
  expect(loadingText).toBeInTheDocument();
});
