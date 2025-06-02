import { ImageInfo, Annotation, UploadResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/images/`, {
      method: 'POST',
      body: formData,
    });

    return this.handleResponse<UploadResponse>(response);
  }

  async getImages(): Promise<ImageInfo[]> {
    const response = await fetch(`${API_BASE_URL}/images/`);
    return this.handleResponse<ImageInfo[]>(response);
  }

  async saveAnnotations(imageId: number, annotations: Annotation[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/images/${imageId}/annotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(annotations),
    });

    await this.handleResponse<{ status: string }>(response);
  }

  async getAnnotations(imageId: number): Promise<Annotation[]> {
    const response = await fetch(`${API_BASE_URL}/images/${imageId}/annotations`);
    return this.handleResponse<Annotation[]>(response);
  }

  async downloadAnnotations(imageId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/images/${imageId}/download-annotations`);
    
    if (!response.ok) {
      throw new Error('Failed to download annotations');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations_${imageId}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  getImageUrl(url: string): string {
    return url;
  }
}

export const apiService = new ApiService(); 