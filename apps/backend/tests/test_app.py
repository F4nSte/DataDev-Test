import os
import tempfile
import pytest
import json
from io import BytesIO
from unittest.mock import patch, mock_open, MagicMock
from PIL import Image

from app import create_app, db
from models import Images, Annotations


@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    # Create a temporary file to serve as the test database
    db_fd, db_path = tempfile.mkstemp()
    
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'UPLOAD_FOLDER': tempfile.mkdtemp(),
    })

    with app.app_context():
        db.create_all()

    yield app

    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()


class TestImageUpload:
    """Test image upload functionality."""
    
    def test_upload_valid_image(self, client, app):
        """Test uploading a valid image file."""
        # Create a test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        with patch('magic.from_buffer') as mock_magic:
            mock_magic.return_value = 'image/jpeg'
            
            response = client.post('/images/', data={
                'file': (img_bytes, 'test.jpg')
            }, content_type='multipart/form-data')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'image_id' in data
        assert data['original_filename'] == 'test.jpg'
        assert data['width'] == 100
        assert data['height'] == 100

    def test_upload_no_file(self, client):
        """Test upload with no file provided."""
        response = client.post('/images/', data={})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    def test_upload_empty_filename(self, client):
        """Test upload with empty filename."""
        response = client.post('/images/', data={
            'file': (BytesIO(b'fake image data'), '')
        }, content_type='multipart/form-data')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    def test_upload_invalid_file_type(self, client):
        """Test upload with invalid file type."""
        with patch('magic.from_buffer') as mock_magic:
            mock_magic.return_value = 'text/plain'
            
            response = client.post('/images/', data={
                'file': (BytesIO(b'not an image'), 'test.txt')
            }, content_type='multipart/form-data')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid file type' in data['error']

    def test_upload_large_file(self, client):
        """Test upload with file too large."""
        # Create a large fake file (larger than 10MB)
        large_data = b'x' * (11 * 1024 * 1024)
        
        response = client.post('/images/', data={
            'file': (BytesIO(large_data), 'large.jpg')
        }, content_type='multipart/form-data')
        
        assert response.status_code == 413

    @patch('PIL.Image.open')
    def test_upload_corrupted_image(self, mock_image_open, client):
        """Test upload with corrupted image."""
        mock_image_open.side_effect = Exception("Cannot identify image file")
        
        with patch('magic.from_buffer') as mock_magic:
            mock_magic.return_value = 'image/jpeg'
            
            response = client.post('/images/', data={
                'file': (BytesIO(b'corrupted image data'), 'corrupted.jpg')
            }, content_type='multipart/form-data')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Failed to process image' in data['error']


class TestImageRetrieval:
    """Test image retrieval functionality."""
    
    def test_get_images_empty(self, client):
        """Test getting images when none exist."""
        response = client.get('/images/')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['images'] == []

    def test_get_images_with_data(self, client, app):
        """Test getting images when some exist."""
        with app.app_context():
            # Add test images to database
            image1 = Images(
                filename='test1.jpg',
                original_filename='test1.jpg',
                file_path='/uploads/test1.jpg',
                upload_time='2023-01-01 12:00:00',
                width=100,
                height=100
            )
            image2 = Images(
                filename='test2.png',
                original_filename='test2.png',
                file_path='/uploads/test2.png',
                upload_time='2023-01-01 13:00:00',
                width=200,
                height=150
            )
            
            db.session.add(image1)
            db.session.add(image2)
            db.session.commit()
        
        response = client.get('/images/')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['images']) == 2
        assert data['images'][0]['original_filename'] == 'test1.jpg'
        assert data['images'][1]['original_filename'] == 'test2.png'


class TestAnnotations:
    """Test annotation functionality."""
    
    def test_save_annotations_valid(self, client, app):
        """Test saving valid annotations."""
        with app.app_context():
            # Add test image to database
            image = Images(
                filename='test.jpg',
                original_filename='test.jpg',
                file_path='/uploads/test.jpg',
                upload_time='2023-01-01 12:00:00'
            )
            db.session.add(image)
            db.session.commit()
            image_id = image.id
        
        annotations_data = {
            'annotations': [
                {
                    'type': 'box',
                    'x': 10,
                    'y': 20,
                    'w': 100,
                    'h': 50,
                    'label': 'test box'
                },
                {
                    'type': 'polygon',
                    'points': [[0, 0], [100, 0], [50, 50]],
                    'label': 'test polygon'
                }
            ]
        }
        
        response = client.post(f'/images/{image_id}/annotations',
                               data=json.dumps(annotations_data),
                               content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'message' in data

    def test_save_annotations_invalid_image_id(self, client):
        """Test saving annotations for non-existent image."""
        annotations_data = {
            'annotations': [
                {
                    'type': 'box',
                    'x': 10,
                    'y': 20,
                    'w': 100,
                    'h': 50
                }
            ]
        }
        
        response = client.post('/images/999/annotations',
                               data=json.dumps(annotations_data),
                               content_type='application/json')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data

    def test_get_annotations_empty(self, client, app):
        """Test getting annotations when none exist."""
        with app.app_context():
            # Add test image to database
            image = Images(
                filename='test.jpg',
                original_filename='test.jpg',
                file_path='/uploads/test.jpg',
                upload_time='2023-01-01 12:00:00'
            )
            db.session.add(image)
            db.session.commit()
            image_id = image.id
        
        response = client.get(f'/images/{image_id}/annotations')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['annotations'] == []

    def test_get_annotations_with_data(self, client, app):
        """Test getting annotations when some exist."""
        with app.app_context():
            # Add test image to database
            image = Images(
                filename='test.jpg',
                original_filename='test.jpg',
                file_path='/uploads/test.jpg',
                upload_time='2023-01-01 12:00:00'
            )
            db.session.add(image)
            db.session.commit()
            
            # Add test annotations
            annotation = Annotations(
                image_id=image.id,
                annotation_type='box',
                data=json.dumps({
                    'x': 10,
                    'y': 20,
                    'w': 100,
                    'h': 50,
                    'label': 'test'
                }),
                created_at='2023-01-01 12:00:00'
            )
            db.session.add(annotation)
            db.session.commit()
            image_id = image.id
        
        response = client.get(f'/images/{image_id}/annotations')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['annotations']) == 1
        assert data['annotations'][0]['type'] == 'box'


class TestDownloadAnnotations:
    """Test annotation download functionality."""
    
    def test_download_annotations_json(self, client, app):
        """Test downloading annotations in JSON format."""
        with app.app_context():
            # Add test image and annotations
            image = Images(
                filename='test.jpg',
                original_filename='test.jpg',
                file_path='/uploads/test.jpg',
                upload_time='2023-01-01 12:00:00'
            )
            db.session.add(image)
            db.session.commit()
            
            annotation = Annotations(
                image_id=image.id,
                annotation_type='box',
                data=json.dumps({
                    'x': 10,
                    'y': 20,
                    'w': 100,
                    'h': 50
                }),
                created_at='2023-01-01 12:00:00'
            )
            db.session.add(annotation)
            db.session.commit()
            image_id = image.id
        
        response = client.get(f'/images/{image_id}/download-annotations')
        
        assert response.status_code == 200
        assert 'application/json' in response.content_type
        data = json.loads(response.data)
        assert 'image' in data
        assert 'annotations' in data

    def test_download_annotations_coco(self, client, app):
        """Test downloading annotations in COCO format."""
        with app.app_context():
            # Add test image with dimensions
            image = Images(
                filename='test.jpg',
                original_filename='test.jpg',
                file_path='/uploads/test.jpg',
                upload_time='2023-01-01 12:00:00',
                width=640,
                height=480
            )
            db.session.add(image)
            db.session.commit()
            
            annotation = Annotations(
                image_id=image.id,
                annotation_type='box',
                data=json.dumps({
                    'x': 10,
                    'y': 20,
                    'w': 100,
                    'h': 50,
                    'label': 'object'
                }),
                created_at='2023-01-01 12:00:00'
            )
            db.session.add(annotation)
            db.session.commit()
            image_id = image.id
        
        response = client.get(f'/images/{image_id}/download-annotations?format=coco')
        
        assert response.status_code == 200
        assert 'application/json' in response.content_type
        data = json.loads(response.data)
        assert 'images' in data
        assert 'annotations' in data
        assert 'categories' in data

    def test_download_annotations_invalid_image(self, client):
        """Test downloading annotations for non-existent image."""
        response = client.get('/images/999/download-annotations')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data


class TestStaticFiles:
    """Test static file serving."""
    
    @patch('os.path.exists')
    @patch('flask.send_from_directory')
    def test_serve_upload_file_exists(self, mock_send, mock_exists, client, app):
        """Test serving existing upload file."""
        mock_exists.return_value = True
        mock_send.return_value = 'file_content'
        
        response = client.get('/uploads/test.jpg')
        
        assert mock_send.called
        mock_exists.assert_called_once()

    def test_serve_upload_file_not_exists(self, client, app):
        """Test serving non-existent upload file."""
        response = client.get('/uploads/nonexistent.jpg')
        
        assert response.status_code == 404


class TestErrorHandling:
    """Test error handling."""
    
    def test_404_handler(self, client):
        """Test 404 error handler."""
        response = client.get('/nonexistent-endpoint')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data

    def test_500_handler(self, client, app):
        """Test 500 error handler."""
        # Create an endpoint that will cause a 500 error
        @app.route('/test-500')
        def test_500():
            raise Exception("Test error")
        
        response = client.get('/test-500')
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data


class TestCORS:
    """Test CORS functionality."""
    
    def test_cors_headers(self, client):
        """Test CORS headers are present."""
        response = client.get('/images/')
        
        assert 'Access-Control-Allow-Origin' in response.headers

    def test_options_request(self, client):
        """Test preflight OPTIONS request."""
        response = client.options('/images/')
        
        assert response.status_code == 200
        assert 'Access-Control-Allow-Methods' in response.headers 