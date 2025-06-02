export interface ImageInfo {
  id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  upload_time: string;
  url: string;
  width?: number;
  height?: number;
}

export interface BoxAnnotation {
  type: 'box';
  x: number;
  y: number;
  w: number;
  h: number;
  id?: string;
  label?: string;
}

export interface PolygonAnnotation {
  type: 'polygon';
  points: [number, number][];
  id?: string;
  label?: string;
}

export type Annotation = BoxAnnotation | PolygonAnnotation;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ImagesResponse {
  images: ImageInfo[];
}

export interface AnnotationsResponse {
  annotations: Annotation[];
}

export interface UploadResponse {
  image_id: number;
  filename: string;
  original_filename: string;
  url: string;
  width?: number;
  height?: number;
}

export type DrawingMode = 'box' | 'polygon' | 'none';

export interface AnnotationHistory {
  annotations: Annotation[];
  timestamp: number;
}

export interface UndoRedoState {
  history: AnnotationHistory[];
  currentIndex: number;
} 