
# DataDev Test 

Hi, this is a mini full-stack web page that serves as an image annotation tool that was made for a developer test for the company DataDev.

  

## 🚀 Setup & Run Instructions

### Option 1: Quick Start with Docker (Recommended)

  

```bash

# Clone the repository

git  clone  <repository-url>

cd  DataDev-Test

# Start with Docker

cd  docker

docker-compose  up  -d

```

Access the application at: `http://localhost:3000`

### Option 2: Manual Development Setup

#### Prerequisites

- Python 3.11+

- Node.js 18+

- npm

  

#### Backend Setup

```bash

cd  apps/backend

# Install dependencies

pip  install  -r  requirements.txt

# Start the Flask server

python3  src/app.py

```

Backend will run on: `http://localhost:5000`

  
#### Frontend Setup

```bash

cd  apps/frontend

# Install dependencies

npm  install

# Start the React development server

npm  start

```

  

Frontend will run on: `http://localhost:3000`

  

## 🛠️ Tech Choices and Trade-offs

  

### Frontend: React + TypeScript

**Chosen:** React with TypeScript

  

**Why:**

-  **Component-based architecture** - Perfect for UI-heavy annotation tool

-  **TypeScript** - Type safety for complex annotation objects and state management

-  **Canvas API** - Direct pixel manipulation for precise drawing tools

-  **React Hooks** - Modern state management for complex annotation state

  

**Trade-offs:**

-  **Bundle size** - React adds overhead, but justified by development speed

-  **Canvas vs SVG** - Canvas chosen for better performance with large images, but loses vector scalability

-  **No external UI library** - Custom styling for full control, but more development time

  

### Backend: Flask + SQLite

**Chosen:** Flask with SQLite database

  

**Why:**

-  **Lightweight** 

-  **Flask simplicity** - Easy to understand and extend

-  **SQLite** - Great for development and small deployments

**Trade-offs:**

-  **SQLite limitations** - Not suitable for high-concurrency production use

-  **No ORM complexity** - Direct SQL for simplicity, but manual query optimization

-  **Single-threaded** - Flask dev server vs production WSGI deployment

### Key Architectural Decisions

#### 1. **Monorepo Structure**

-  **Pro:** All code in one place, easier development

-  **Con:** Larger repository, but manageable for this scope

  

#### 2. **Undo/Redo Implementation**

-  **Approach:** Deep copying of annotation state vs event sourcing

-  **Trade-off:** Memory usage vs complexity - chose memory for simplicity

  

#### 3. **File Storage**

-  **Approach:** Local filesystem vs cloud storage

-  **Trade-off:** Simplicity vs scalability

  

#### 4. **Export Formats**

-  **Supports:** JSON, COCO, YOLO

-  **Trade-off:** More formats vs maintenance 

  

#### 5. **Canvas Drawing**

-  **Approach:** Direct canvas manipulation vs library (e.g., Fabric.js)

-  **Trade-off:** Full control vs development time 

## 🧪 How to run Tests


### Frontend Testing

```bash

cd  apps/frontend

# Run all tests

npm  test

# Run tests with coverage

npm  test  --  --coverage

# Run specific test file

npm  test  --  ImageAnnotator.test.tsx

```

**Test Coverage:**

- ✅ **ImageAnnotator** - Drawing tools, undo/redo, annotation management

- ✅ **ImageUpload** - File validation, drag & drop, upload progress

- ✅ **ImageList** - Display, selection, error handling

  

### Backend Testing

```bash

cd  apps/backend

# Run all tests

python  -m  pytest  tests/

# Run with verbose output

python  -m  pytest  tests/  -v

# Run specific test file

python  -m  pytest  tests/test_app.py  -v

# Run with coverage

python  -m  pytest  tests/  --cov=src

```

**Test Coverage:**

- ✅ **API endpoints** - Upload, list, annotations, download

- ✅ **File validation** - MIME types, size limits, security

- ✅ **Data formats** - JSON, COCO, YOLO export

- ✅ **Database operations** - CRUD operations, data integrity

  

### Manual Testing Scenarios

  
#### 1. **Image Upload**

- ✅ Drag & drop multiple images

- ✅ Click to select files

- ✅ Test file size limits (10MB max)

- ✅ Test invalid file types

- ✅ Progress indicators

  
#### 2. **Annotation Creation**

- ✅ Draw bounding boxes (click & drag)

- ✅ Draw polygons (click points + finish)

- ✅ Add labels to annotations

- ✅ Select and modify annotations

  
#### 3. **Undo/Redo System**

- ✅ Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)

- ✅ Button clicks

- ✅ History persistence

- ✅ State consistency

  
#### 4. **Data Export**

- ✅ Download JSON format

- ✅ Download COCO format

- ✅ Download YOLO format

- ✅ Verify format correctness

  
#### 5. **Responsive Design**

- ✅ Mobile devices (phones/tablets)

- ✅ Desktop browsers

- ✅ Different screen sizes

- ✅ Touch vs mouse interactions

  

### Integration Testing


```bash

# Start both frontend and backend

# Frontend: http://localhost:3000

# Backend: http://localhost:5000


# Test complete workflow:

# 1. Upload images

# 2. Create annotations

# 3. Save annotations

# 4. Export in different formats

# 5. Verify data persistence

```

**Made by Stefan Jovišić**
