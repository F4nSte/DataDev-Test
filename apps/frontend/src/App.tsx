import React, { useState, useEffect } from 'react';
import './App.css';
import ImageUpload from './components/ImageUpload';
import ImageList from './components/ImageList';
import ImageAnnotator from './components/ImageAnnotator';
import { ImageInfo } from './types';
import { apiService } from './services/api';

function App() {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const loadedImages = await apiService.getImages();
      setImages(loadedImages);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  };

  const handleUploadSuccess = () => {
    loadImages();
  };

  const handleImageSelect = (image: ImageInfo) => {
    setSelectedImage(image);
  };

  const handleCloseAnnotator = () => {
    setSelectedImage(null);
  };

  return (
    <div className="App">
      <header className="header" style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(15px)',
        padding: '20px 0',
        marginBottom: '30px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          textAlign: 'center'
        }}>
          <h1 className="text-gradient floating" style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
             DataDev Image Annotation Test
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            color: '#666',
            fontSize: '16px',
            fontWeight: '300'
          }}>
            Upload images and create annotations.
          </p>
        </div>
      </header>
      
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        minHeight: 'calc(100vh - 200px)'
      }}>
        <div className="card" style={{
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '30px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{
            marginTop: 0,
            marginBottom: '20px',
            color: '#333',
            fontSize: '22px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            📤 Upload Images
            <span style={{
              fontSize: '12px',
              fontWeight: '400',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              padding: '4px 12px',
              borderRadius: '20px',
              color: 'white'
            }}>
              Enhanced Security
            </span>
          </h2>
          <ImageUpload onUploadSuccess={handleUploadSuccess} />
        </div>

        <div className="card" style={{
          borderRadius: '16px',
          padding: '30px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{
            marginTop: 0,
            marginBottom: '20px',
            color: '#333',
            fontSize: '22px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            🖼️ Your Images
            {images.length > 0 && (
              <span style={{
                fontSize: '12px',
                fontWeight: '400',
                background: 'linear-gradient(135deg, #28a745, #20c997)',
                padding: '4px 12px',
                borderRadius: '20px',
                color: 'white'
              }}>
                {images.length} {images.length === 1 ? 'image' : 'images'}
              </span>
            )}
          </h2>
          <ImageList images={images} onImageSelect={handleImageSelect} />
        </div>

        {images.length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.12))',
            border: '2px solid rgba(102, 126, 234, 0.4)',
            borderRadius: '20px',
            padding: '40px',
            marginTop: '30px',
            backdropFilter: 'blur(15px)',
            textAlign: 'center',
            boxShadow: '0 12px 40px rgba(102, 126, 234, 0.2)'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '15px',
              filter: 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.4))',
              transform: 'scale(1.1)'
            }}>
              🚀
            </div>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '10px',
              fontSize: '24px',
              fontWeight: '700',
              color: '#1a202c',
              textShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              Getting Started
            </h3>
            <p style={{ 
              marginBottom: 0, 
              fontSize: '16px',
              color: '#2d3748',
              lineHeight: '1.6',
              fontWeight: '600'
            }}>
              Upload your first image above to start creating annotations! 
              Use bounding boxes and polygons to label objects in your images.
            </p>
          </div>
        )}
      </main>

      <footer style={{
        marginTop: '60px',
        padding: '30px 0',
        background: 'white',
        borderTop: '1px solid rgba(102, 126, 234, 0.1)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <span style={{
              fontSize: '20px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: '700'
            }}>
              ⚡
            </span>
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              DataDev 2025
            </span>
          </div>
          <p style={{
            margin: 0,
            color: '#718096',
            fontSize: '13px',
            fontWeight: '400'
          }}>
            All rights reserved • Image annotation tool developer test
          </p>
        </div>
      </footer>

      {selectedImage && (
        <ImageAnnotator 
          image={selectedImage} 
          onClose={handleCloseAnnotator}
        />
      )}
    </div>
  );
}

export default App;
