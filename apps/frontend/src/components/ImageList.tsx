import React from 'react';
import { ImageInfo } from '../types';
import { apiService } from '../services/api';

interface ImageListProps {
  images: ImageInfo[];
  onImageSelect: (image: ImageInfo) => void;
  selectedImageId?: number;
}

const ImageList: React.FC<ImageListProps> = ({ images, onImageSelect, selectedImageId }) => {
  if (images.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <div className="floating" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.6 }}>🖼️</div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
          No images uploaded yet
        </h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '0' }}>
          Upload some images to start creating beautiful annotations
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="image-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        {images.map((image, index) => (
          <div
            key={image.id}
            onClick={() => onImageSelect(image)}
            className={`image-card ${selectedImageId === image.id ? 'selected' : ''}`}
            style={{
              border: selectedImageId === image.id ? '2px solid #667eea' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              overflow: 'hidden',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: selectedImageId === image.id 
                ? '0 15px 30px rgba(102, 126, 234, 0.3)' 
                : '0 8px 25px rgba(0,0,0,0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animationDelay: `${index * 0.1}s`
            }}
          >
            <div style={{ 
              height: '160px', 
              overflow: 'hidden',
              backgroundColor: '#f8f9fa',
              position: 'relative'
            }}>
              <img
                src={apiService.getImageUrl(image.url)}
                alt={image.original_filename}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.4s ease'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 160px; color: #666; background: linear-gradient(135deg, #f8f9fa, #e9ecef);">
                      <div style="font-size: 36px; margin-bottom: 8px; opacity: 0.5;">❌</div>
                      <span style="font-size: 12px;">Image not found</span>
                    </div>
                  `;
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              />
              
              {image.width && image.height && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '3px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: '500',
                  backdropFilter: 'blur(5px)'
                }}>
                  {image.width} × {image.height}
                </div>
              )}
              
              {selectedImageId === image.id && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  padding: '4px',
                  borderRadius: '50%',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  ✓
                </div>
              )}
            </div>
            
            <div style={{ 
              padding: '12px'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '6px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: '1.3'
              }}>
                {image.original_filename}
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: '#666'
              }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  📅 {new Date(image.upload_time).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                
                {image.width && image.height && (
                  <span style={{
                    background: 'linear-gradient(135deg, #28a745, #20c997)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontSize: '9px',
                    fontWeight: '500'
                  }}>
                    ✓ Ready
                  </span>
                )}
              </div>
              
              <div style={{
                marginTop: '8px',
                padding: '6px 0',
                borderTop: '1px solid rgba(255, 255, 255, 0.5)',
                textAlign: 'center'
              }}>
                <span style={{
                  fontSize: '11px',
                  color: '#667eea',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}>
                  🎨 Click to annotate
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageList; 