import React, { useState, useRef } from 'react';
import { apiService } from '../services/api';

interface ImageUploadProps {
  onUploadSuccess: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    setUploading(true);
    
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validFiles = fileArray.filter(file => {
      const isValidType = supportedTypes.includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024;
      
      if (!isValidType) {
        showMessage(`${file.name}: Unsupported file type. Use JPEG, PNG, GIF, or WebP.`, 'error');
        return false;
      }
      if (!isValidSize) {
        showMessage(`${file.name}: File too large. Max size is 10MB.`, 'error');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      setUploading(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const file of validFiles) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: Math.min(prev[file.name] + Math.random() * 30, 90)
          }));
        }, 200);

        await apiService.uploadImage(file);
        
        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        successCount++;
        
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }, 1000);
        
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
        errorCount++;
      }
    }

    setUploading(false);
    
    if (successCount > 0) {
      showMessage(
        `Successfully uploaded ${successCount} image${successCount > 1 ? 's' : ''}! 🎉`,
        'success'
      );
      onUploadSuccess();
    }
    
    if (errorCount > 0) {
      showMessage(
        `Failed to upload ${errorCount} image${errorCount > 1 ? 's' : ''}. Please try again.`,
        'error'
      );
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const isActive = uploading || Object.keys(uploadProgress).length > 0;

  return (
    <div>
      {message && (
        <div 
          className={message.type === 'success' ? 'success-message' : 'error-message'}
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '20px',
            background: message.type === 'success' 
              ? 'linear-gradient(135deg, rgba(40, 167, 69, 0.1), rgba(32, 201, 151, 0.1))'
              : 'linear-gradient(135deg, rgba(220, 53, 69, 0.1), rgba(253, 126, 20, 0.1))',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? 'rgba(40, 167, 69, 0.3)' : 'rgba(220, 53, 69, 0.3)'}`,
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <span style={{ fontSize: '16px' }}>{message.type === 'success' ? '✅' : '❌'}</span>
          {message.text}
        </div>
      )}

      <div
        className={`upload-area ${dragOver ? 'drag-over' : ''} ${isActive ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        style={{
          border: dragOver 
            ? '3px dashed #667eea' 
            : '2px dashed rgba(102, 126, 234, 0.3)',
          borderRadius: '16px',
          padding: '40px 30px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver 
            ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.1))'
            : 'linear-gradient(135deg, rgba(248, 249, 250, 0.6), rgba(233, 236, 239, 0.4))',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <div style={{
          fontSize: '48px',
          marginBottom: '15px',
          filter: dragOver ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease'
        }}>
          📁
        </div>

        <h3 style={{
          margin: '0 0 10px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          Upload Images
        </h3>
        
        <p style={{
          margin: '0 0 15px 0',
          color: '#666',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          Drag & drop images here, or click to select files
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '15px',
          flexWrap: 'wrap'
        }}>
          {['JPEG', 'PNG', 'GIF', 'WebP'].map(format => (
            <span
              key={format}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '500'
              }}
            >
              {format}
            </span>
          ))}
        </div>

        <p style={{
          margin: 0,
          color: '#888',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px'
        }}>
          ⚠️ Max 10MB per file • MIME validation enabled
        </p>

        {Object.keys(uploadProgress).length > 0 && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '12px',
            backdropFilter: 'blur(5px)'
          }}>
            <h4 style={{
              margin: '0 0 10px 0',
              fontSize: '14px',
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              📤 Uploading...
            </h4>
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <div key={fileName} style={{ marginBottom: '8px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: '#666',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {fileName}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: progress === 100 ? '#28a745' : '#667eea'
                  }}>
                    {Math.round(progress)}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(102, 126, 234, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: progress === 100 
                      ? 'linear-gradient(90deg, #28a745, #20c997)'
                      : 'linear-gradient(90deg, #667eea, #764ba2)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload; 