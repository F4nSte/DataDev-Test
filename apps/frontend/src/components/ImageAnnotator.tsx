import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ImageInfo, Annotation, BoxAnnotation, PolygonAnnotation, DrawingMode, UndoRedoState } from '../types';
import { apiService } from '../services/api';

interface ImageAnnotatorProps {
  image: ImageInfo;
  onClose: () => void;
}

const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({ image, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState<Partial<BoxAnnotation> | null>(null);
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [labelText, setLabelText] = useState('');
  
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>({
    history: [],
    currentIndex: -1
  });
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [touchMoved, setTouchMoved] = useState<boolean>(false);

  useEffect(() => {
    const loadAnnotations = async () => {
      try {
        const loadedAnnotations = await apiService.getAnnotations(image.id);
        
        const validAnnotations = loadedAnnotations.filter((ann, index) => {
          if (!ann || typeof ann !== 'object') return false;
          if (!ann.type) return false;
          if (ann.type === 'polygon' && (!ann.points || !Array.isArray(ann.points))) return false;
          if (ann.type === 'box' && (typeof ann.x !== 'number' || typeof ann.y !== 'number' || typeof ann.w !== 'number' || typeof ann.h !== 'number')) return false;
          return true;
        });
        
        setAnnotations(validAnnotations);
        addToHistory(validAnnotations);
      } catch (error) {
        console.error('Failed to load annotations:', error);
      }
    };

    loadAnnotations();
  }, [image.id]);

  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [annotations, imageLoaded, currentBox, currentPolygon, selectedAnnotation]);

  const addToHistory = useCallback((newAnnotations: Annotation[]) => {
    setUndoRedoState(prev => {
      const newHistory = prev.history.slice(0, prev.currentIndex + 1);
      newHistory.push({
        annotations: JSON.parse(JSON.stringify(newAnnotations)),
        timestamp: Date.now()
      });
      
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return {
        history: newHistory,
        currentIndex: newHistory.length - 1
      };
    });
  }, []);

  const undo = useCallback(() => {
    setUndoRedoState(prev => {
      if (prev.currentIndex > 0) {
        const newIndex = prev.currentIndex - 1;
        const historicalAnnotations = prev.history[newIndex].annotations;
        setAnnotations(historicalAnnotations);
        return {
          ...prev,
          currentIndex: newIndex
        };
      }
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setUndoRedoState(prev => {
      if (prev.currentIndex < prev.history.length - 1) {
        const newIndex = prev.currentIndex + 1;
        const historicalAnnotations = prev.history[newIndex].annotations;
        setAnnotations(historicalAnnotations);
        return {
          ...prev,
          currentIndex: newIndex
        };
      }
      return prev;
    });
  }, []);

  const updateAnnotations = useCallback((newAnnotations: Annotation[]) => {
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
  }, [addToHistory]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    annotations.forEach((annotation, index) => {
      const isSelected = selectedAnnotation?.id === annotation.id;
      if (annotation.type === 'box') {
        drawBox(ctx, annotation, isSelected);
      } else if (annotation.type === 'polygon') {
        drawPolygon(ctx, annotation, isSelected);
      }
    });

    if (currentBox) {
      drawBox(ctx, currentBox as BoxAnnotation, false);
    }

    if (currentPolygon.length > 0) {
      drawPolygon(ctx, { type: 'polygon', points: currentPolygon }, false);
    }
  }, [annotations, currentBox, currentPolygon, selectedAnnotation]);

  const drawBox = (ctx: CanvasRenderingContext2D, box: Partial<BoxAnnotation>, isSelected: boolean) => {
    if (box.x !== undefined && box.y !== undefined && box.w !== undefined && box.h !== undefined) {
      ctx.strokeStyle = isSelected ? '#ff8800' : '#ff0000';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      
      const labelText = box.label || 'Box';
      const labelWidth = Math.max(60, labelText.length * 8 + 10);
      ctx.fillStyle = isSelected ? '#ff8800' : '#ff0000';
      ctx.fillRect(box.x, box.y - 20, labelWidth, 20);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(labelText, box.x + 5, box.y - 7);
    }
  };

  const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: Partial<PolygonAnnotation>, isSelected: boolean) => {
    if (!polygon.points || polygon.points.length < 2) return;

    ctx.strokeStyle = isSelected ? '#88ff00' : '#00ff00';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.beginPath();
    
    const [firstPoint] = polygon.points;
    ctx.moveTo(firstPoint[0], firstPoint[1]);
    
    polygon.points.slice(1).forEach(([x, y]) => {
      ctx.lineTo(x, y);
    });
    
    if (polygon.points.length > 2) {
      ctx.closePath();
    }
    
    ctx.stroke();

    polygon.points.forEach(([x, y]) => {
      ctx.fillStyle = isSelected ? '#88ff00' : '#00ff00';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    if (polygon.points.length > 0) {
      const [x, y] = polygon.points[0];
      const labelText = polygon.label || 'Polygon';
      const labelWidth = Math.max(70, labelText.length * 8 + 10);
      ctx.fillStyle = isSelected ? '#88ff00' : '#00ff00';
      ctx.fillRect(x, y - 20, labelWidth, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(labelText, x + 5, y - 7);
    }
  };

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX: number, clientY: number;
    
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('changedTouches' in event && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      const mouseEvent = event as React.MouseEvent<HTMLCanvasElement>;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const findAnnotationAt = (x: number, y: number): Annotation | null => {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i];
      
      if (!annotation || typeof annotation !== 'object') continue;
      
      try {
        if (annotation.type === 'box') {
          const box = annotation as BoxAnnotation;
          if (typeof box.x === 'number' && typeof box.y === 'number' && 
              typeof box.w === 'number' && typeof box.h === 'number') {
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
              return annotation;
            }
          }
        } else if (annotation.type === 'polygon') {
          const polygon = annotation as PolygonAnnotation;
          
          if (!polygon.points || !Array.isArray(polygon.points) || polygon.points.length === 0) continue;
          
          const validPoints = polygon.points.every((point, pointIndex) => {
            if (!Array.isArray(point) || point.length < 2) return false;
            if (typeof point[0] !== 'number' || typeof point[1] !== 'number') return false;
            return true;
          });
          
          if (!validPoints) continue;
          
          let inside = false;
          for (let j = 0, k = polygon.points.length - 1; j < polygon.points.length; k = j++) {
            const [xi, yi] = polygon.points[j];
            const [xk, yk] = polygon.points[k];
            if (((yi > y) !== (yk > y)) && (x < (xk - xi) * (y - yi) / (yk - yi) + xi)) {
              inside = !inside;
            }
          }
          if (inside) {
            return annotation;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return null;
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event);
    
    if (drawingMode === 'none') {
      const foundAnnotation = findAnnotationAt(x, y);
      setSelectedAnnotation(foundAnnotation);
    } else if (drawingMode === 'box') {
      setCurrentBox({ type: 'box', x, y, w: 0, h: 0 });
      setIsDrawing(true);
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    setTouchStartTime(Date.now());
    setTouchMoved(false);
    
    const { x, y } = getCanvasCoordinates(event);
    
    if (drawingMode === 'none') {
      const foundAnnotation = findAnnotationAt(x, y);
      setSelectedAnnotation(foundAnnotation);
    } else if (drawingMode === 'box') {
      event.preventDefault();
      setCurrentBox({ type: 'box', x, y, w: 0, h: 0 });
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingMode === 'box' && isDrawing && currentBox) {
      const { x, y } = getCanvasCoordinates(event);
      setCurrentBox({
        ...currentBox,
        w: x - currentBox.x!,
        h: y - currentBox.y!
      });
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    setTouchMoved(true);
    
    if (drawingMode === 'box' && isDrawing && currentBox) {
      event.preventDefault();
      const { x, y } = getCanvasCoordinates(event);
      setCurrentBox({
        ...currentBox,
        w: x - currentBox.x!,
        h: y - currentBox.y!
      });
    }
  };

  const handleMouseUp = () => {
    if (drawingMode === 'box' && isDrawing && currentBox) {
      if (Math.abs(currentBox.w!) > 10 && Math.abs(currentBox.h!) > 10) {
        const newAnnotation: BoxAnnotation = {
          type: 'box',
          x: Math.min(currentBox.x!, currentBox.x! + currentBox.w!),
          y: Math.min(currentBox.y!, currentBox.y! + currentBox.h!),
          w: Math.abs(currentBox.w!),
          h: Math.abs(currentBox.h!),
          id: Date.now().toString(),
          label: ''
        };
        updateAnnotations([...annotations, newAnnotation]);
        setSelectedAnnotation(newAnnotation);
        setShowLabelInput(true);
        setLabelText('');
      }
      setCurrentBox(null);
      setIsDrawing(false);
      setDrawingMode('none');
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    const touchDuration = Date.now() - touchStartTime;
    const wasTap = !touchMoved && touchDuration < 300;
    
    if (drawingMode === 'polygon' && wasTap) {
      const { x, y } = getCanvasCoordinates(event);
      setCurrentPolygon([...currentPolygon, [x, y]]);
      return;
    }
    
    if (drawingMode === 'box' && isDrawing && currentBox) {
      event.preventDefault();
      if (Math.abs(currentBox.w!) > 10 && Math.abs(currentBox.h!) > 10) {
        const newAnnotation: BoxAnnotation = {
          type: 'box',
          x: Math.min(currentBox.x!, currentBox.x! + currentBox.w!),
          y: Math.min(currentBox.y!, currentBox.y! + currentBox.h!),
          w: Math.abs(currentBox.w!),
          h: Math.abs(currentBox.h!),
          id: Date.now().toString(),
          label: ''
        };
        updateAnnotations([...annotations, newAnnotation]);
        setSelectedAnnotation(newAnnotation);
        setShowLabelInput(true);
        setLabelText('');
      }
      setCurrentBox(null);
      setIsDrawing(false);
      setDrawingMode('none');
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingMode === 'polygon') {
      const { x, y } = getCanvasCoordinates(event);
      setCurrentPolygon([...currentPolygon, [x, y]]);
    }
  };

  const finishPolygon = () => {
    if (currentPolygon.length >= 3) {
      const newAnnotation: PolygonAnnotation = {
        type: 'polygon',
        points: currentPolygon,
        id: Date.now().toString(),
        label: ''
      };
      updateAnnotations([...annotations, newAnnotation]);
      setSelectedAnnotation(newAnnotation);
      setShowLabelInput(true);
      setLabelText('');
    }
    setCurrentPolygon([]);
    setDrawingMode('none');
  };

  const cancelDrawing = () => {
    setCurrentBox(null);
    setCurrentPolygon([]);
    setDrawingMode('none');
    setIsDrawing(false);
  };

  const deleteSelectedAnnotation = () => {
    if (selectedAnnotation) {
      const newAnnotations = annotations.filter(ann => ann.id !== selectedAnnotation.id);
      updateAnnotations(newAnnotations);
      setSelectedAnnotation(null);
    }
  };

  const clearAllAnnotations = () => {
    if (window.confirm('Are you sure you want to clear all annotations?')) {
      updateAnnotations([]);
      setSelectedAnnotation(null);
    }
  };

  const saveLabel = () => {
    if (selectedAnnotation && labelText.trim()) {
      const newAnnotations = annotations.map(ann => 
        ann.id === selectedAnnotation.id 
          ? { ...ann, label: labelText.trim() }
          : ann
      );
      updateAnnotations(newAnnotations);
      setSelectedAnnotation({ ...selectedAnnotation, label: labelText.trim() });
    }
    setShowLabelInput(false);
    setLabelText('');
  };

  const saveAnnotations = async () => {
    setSaving(true);
    try {
      await apiService.saveAnnotations(image.id, annotations);
      alert('Annotations saved successfully!');
    } catch (error) {
      console.error('Failed to save annotations:', error);
      alert('Failed to save annotations');
    } finally {
      setSaving(false);
    }
  };

  const downloadAnnotations = async (format: 'json' | 'coco' | 'yolo' = 'json') => {
    const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
    
    try {
      if (format === 'coco') {
        const response = await fetch(`${API_BASE_URL}/images/${image.id}/download-annotations?format=coco`);
        if (!response.ok) throw new Error('Failed to download COCO annotations');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coco_annotations_${image.id}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (format === 'yolo') {
        const response = await fetch(`${API_BASE_URL}/images/${image.id}/download-annotations?format=yolo`);
        if (!response.ok) throw new Error('Failed to download YOLO annotations');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yolo_annotations_${image.id}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        await apiService.downloadAnnotations(image.id);
      }
    } catch (error) {
      console.error('Failed to download annotations:', error);
      alert('Failed to download annotations');
    }
  };

  const handleImageLoad = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    const maxWidth = 800;
    const maxHeight = 600;
    const ratio = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
    
    canvas.style.width = `${img.naturalWidth * ratio}px`;
    canvas.style.height = `${img.naturalHeight * ratio}px`;

    setImageLoaded(true);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          undo();
        } else if (event.key === 'z' && event.shiftKey || event.key === 'y') {
          event.preventDefault();
          redo();
        }
      }
      if (event.key === 'Delete' && selectedAnnotation) {
        deleteSelectedAnnotation();
      }
      if (event.key === 'Escape') {
        cancelDrawing();
        setSelectedAnnotation(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedAnnotation, deleteSelectedAnnotation]);

  const canUndo = undoRedoState.currentIndex > 0;
  const canRedo = undoRedoState.currentIndex < undoRedoState.history.length - 1;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '10px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: window.innerWidth <= 768 ? '10px' : '20px',
        maxWidth: '95%',
        maxHeight: '95%',
        overflow: 'auto',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: window.innerWidth <= 768 ? '10px' : '20px',
          borderBottom: '1px solid #eee',
          paddingBottom: '10px',
          flexWrap: 'wrap'
        }}>
          <h3 style={{ 
            margin: 0,
            fontSize: window.innerWidth <= 768 ? '16px' : '18px',
            wordBreak: 'break-word',
            flex: 1,
            marginRight: '10px'
          }}>{image.original_filename}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '5px',
              minWidth: '40px'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: window.innerWidth <= 768 ? '5px' : '10px',
          marginBottom: window.innerWidth <= 768 ? '10px' : '20px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setDrawingMode('box')}
            style={{
              padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
              backgroundColor: drawingMode === 'box' ? '#007bff' : '#f8f9fa',
              color: drawingMode === 'box' ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
              whiteSpace: 'nowrap'
            }}
          >
            📦 Box
          </button>
          
          <button
            onClick={() => setDrawingMode('polygon')}
            style={{
              padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
              backgroundColor: drawingMode === 'polygon' ? '#28a745' : '#f8f9fa',
              color: drawingMode === 'polygon' ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
              whiteSpace: 'nowrap'
            }}
          >
            🔷 Polygon
          </button>

          {window.innerWidth > 768 && <div style={{ borderLeft: '1px solid #ddd', margin: '0 5px' }}></div>}

          <button
            onClick={undo}
            disabled={!canUndo}
            style={{
              padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
              backgroundColor: canUndo ? '#6c757d' : '#e9ecef',
              color: canUndo ? 'white' : '#6c757d',
              border: 'none',
              borderRadius: '4px',
              cursor: canUndo ? 'pointer' : 'not-allowed',
              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
              whiteSpace: 'nowrap'
            }}
          >
            ↶
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            style={{
              padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
              backgroundColor: canRedo ? '#6c757d' : '#e9ecef',
              color: canRedo ? 'white' : '#6c757d',
              border: 'none',
              borderRadius: '4px',
              cursor: canRedo ? 'pointer' : 'not-allowed',
              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
              whiteSpace: 'nowrap'
            }}
          >
            ↷
          </button>

          {window.innerWidth <= 768 && <div style={{ width: '100%', height: 0 }}></div>}

          {selectedAnnotation && (
            <button
              onClick={() => { setShowLabelInput(true); setLabelText(selectedAnnotation.label || ''); }}
              style={{
                padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                whiteSpace: 'nowrap'
              }}
            >
              🏷️ Label
            </button>
          )}

          {selectedAnnotation && (
            <button
              onClick={deleteSelectedAnnotation}
              style={{
                padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                whiteSpace: 'nowrap'
              }}
            >
              🗑️
            </button>
          )}

          {drawingMode === 'polygon' && currentPolygon.length >= 3 && (
            <button
              onClick={finishPolygon}
              style={{
                padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                whiteSpace: 'nowrap'
              }}
            >
              ✓ Finish
            </button>
          )}

          {(drawingMode !== 'none' || currentPolygon.length > 0) && (
            <button
              onClick={cancelDrawing}
              style={{
                padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                whiteSpace: 'nowrap'
              }}
            >
              ✕
            </button>
          )}

          <button
            onClick={clearAllAnnotations}
            style={{
              padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
              backgroundColor: '#ffc107',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
              whiteSpace: 'nowrap'
            }}
          >
            🗑️ Clear
          </button>

          {window.innerWidth <= 768 && <div style={{ width: '100%', height: 0 }}></div>}

          <button
            onClick={saveAnnotations}
            disabled={saving}
            style={{
              padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
              backgroundColor: saving ? '#6c757d' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
              whiteSpace: 'nowrap'
            }}
          >
            {saving ? '💾...' : '💾 Save'}
          </button>

          <button
            onClick={() => downloadAnnotations('json')}
            style={{
              padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
              whiteSpace: 'nowrap'
            }}
          >
            📥 JSON
          </button>

          <button
            onClick={() => downloadAnnotations('coco')}
            style={{
              padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
              whiteSpace: 'nowrap'
            }}
          >
            📥 COCO
          </button>

          <button
            onClick={() => downloadAnnotations('yolo')}
            style={{
              padding: window.innerWidth <= 768 ? '6px 10px' : '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
              whiteSpace: 'nowrap'
            }}
          >
            📥 YOLO
          </button>
        </div>

        <div style={{ 
          marginBottom: '10px', 
          fontSize: window.innerWidth <= 768 ? '12px' : '14px', 
          color: '#666',
          wordBreak: 'break-word'
        }}>
          Annotations: {annotations.length} | 
          {selectedAnnotation && ` Selected: ${selectedAnnotation.type} ${selectedAnnotation.label ? `(${selectedAnnotation.label})` : ''} |`}
          {drawingMode === 'polygon' && ` Polygon points: ${currentPolygon.length}`}
          {drawingMode === 'box' && ' Click and drag to draw a box'}
          {drawingMode === 'polygon' && ' Click to add points, then finish polygon'}
          {drawingMode === 'none' && ' Click annotations to select them'}
        </div>

        <div style={{
          border: '1px solid #ddd',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: window.innerWidth <= 768 ? '200px' : '300px'
        }}>
          <img
            ref={imageRef}
            src={apiService.getImageUrl(image.url)}
            alt={image.original_filename}
            onLoad={handleImageLoad}
            style={{ display: 'none' }}
          />
          
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleCanvasClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            style={{
              cursor: drawingMode === 'none' ? 'default' : 'crosshair',
              display: imageLoaded ? 'block' : 'none',
              maxWidth: '100%',
              height: 'auto',
              touchAction: drawingMode === 'box' ? 'none' : 'manipulation'
            }}
          />
          
          {!imageLoaded && (
            <div style={{
              width: '100%',
              height: window.innerWidth <= 768 ? '200px' : '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8f9fa',
              color: '#666'
            }}>
              Loading image...
            </div>
          )}
        </div>

        {window.innerWidth > 768 && (
          <div style={{ 
            marginTop: '10px', 
            fontSize: '12px', 
            color: '#666',
            borderTop: '1px solid #eee',
            paddingTop: '10px'
          }}>
            <strong>Shortcuts:</strong> Ctrl+Z (Undo) | Ctrl+Shift+Z (Redo) | Delete (Delete selected) | Esc (Cancel/Deselect)
          </div>
        )}
      </div>

      {showLabelInput && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: window.innerWidth <= 768 ? '15px' : '20px',
            borderRadius: '8px',
            minWidth: window.innerWidth <= 768 ? '280px' : '300px',
            maxWidth: '90%'
          }}>
            <h4 style={{ marginTop: 0, fontSize: window.innerWidth <= 768 ? '16px' : '18px' }}>Add Label</h4>
            <input
              type="text"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              placeholder="Enter label for annotation"
              style={{
                width: '100%',
                padding: window.innerWidth <= 768 ? '10px' : '8px',
                marginBottom: '15px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: window.innerWidth <= 768 ? '16px' : '14px'
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveLabel();
                } else if (e.key === 'Escape') {
                  setShowLabelInput(false);
                }
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowLabelInput(false)}
                style={{
                  padding: window.innerWidth <= 768 ? '10px 16px' : '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: window.innerWidth <= 768 ? '14px' : '13px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveLabel}
                style={{
                  padding: window.innerWidth <= 768 ? '10px 16px' : '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: window.innerWidth <= 768 ? '14px' : '13px'
                }}
              >
                Save Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageAnnotator; 