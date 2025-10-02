# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Frontend (React + Vite + TypeScript)
```bash
# Install dependencies
yarn install

# Start development server (localhost:5173)
yarn dev

# Build for production
yarn build

# Build for development
yarn build:dev

# Lint code
yarn lint

# Preview production build
yarn preview
```

### Backend (Django REST API)
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (Windows)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Create initial test data
python manage.py create_initial_data

# Reset all data (dangerous!)
python manage.py create_initial_data --reset

# Create superuser
python manage.py createsuperuser

# Start Django server (localhost:8000)
python manage.py runserver

# Access Django Admin at http://localhost:8000/admin/
```

### Full Development Setup
```bash
# Terminal 1: Start backend
cd backend
venv\Scripts\activate  # Windows
python manage.py runserver

# Terminal 2: Start frontend
yarn dev
```

## Architecture Overview

### System Architecture
**EquipaHub** is a full-stack equipment management system for universities with:
- **Frontend**: React 18.3.1 with TypeScript, Vite, Tailwind CSS, Shadcn/UI
- **Backend**: Django 4.2.9 with Django REST Framework
- **Database**: MySQL (Railway hosted)
- **Authentication**: JWT tokens with role-based permissions

### Frontend Architecture

#### Key Directories
- `src/pages/` - Main application pages (Dashboard, Equipamentos, Emprestimos, etc.)
- `src/components/` - Reusable components including Shadcn/UI components in `ui/`
- `src/contexts/` - React contexts (AuthContext, NotificationContext)
- `src/lib/` - Utilities and API service layer
- `src/types/` - TypeScript type definitions
- `src/hooks/` - Custom React hooks

#### State Management
- **Authentication**: React Context (`AuthContext`) with JWT token storage
- **API State**: TanStack Query (`@tanstack/react-query`) for server state
- **Notifications**: React Context (`NotificationContext`) for toasts
- **No Global State Store**: Uses React state and contexts only

#### Permission System
Role-based routing with `ProtectedRoute` component:
- **coordenador**: Full access to all features
- **secretario/tecnico**: Manage equipment, loans, reservations
- **docente**: Limited to viewing and creating own loans/reservations

### Backend Architecture

#### Django Apps Structure
- `accounts/` - Custom user model, JWT authentication, user management
- `equipment/` - Equipment CRUD, status management, availability
- `loans/` - Loan lifecycle, return processing, overdue tracking
- `reservations/` - Reservation system, confirmation flow, conversion to loans
- `notifications/` - Notification system (planned feature)

#### Key Models
- **User**: Custom user with roles (coordenador, secretario, tecnico, docente)
- **Equipment**: Brand, model, type, status, serial numbers
- **Loan**: User-equipment relationships with dates, return tracking
- **Reservation**: Future equipment bookings with confirmation workflow

#### API Design
- RESTful API design with Django REST Framework
- JWT authentication via custom `JWTAuthentication` class
- Role-based permissions at view level
- Filtering, searching, pagination built-in
- API endpoints under `/api/v1/`

### Data Flow
1. **Authentication**: Frontend stores JWT in localStorage, sends in Authorization header
2. **API Calls**: Centralized in `src/lib/api.ts` with automatic token injection
3. **Permission Checks**: Both frontend (routing) and backend (API) validate user roles
4. **Real-time Updates**: Manual refetch after mutations (no WebSocket)

## Environment Configuration

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_API_URL=http://localhost:8000/api/v1
```

### Backend `backend/.env`
```env
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=your-database-url
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=True
```

## Key URLs and Endpoints

### Application URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/v1
- **Django Admin**: http://localhost:8000/admin

### Main API Endpoints
- `POST /auth/login/` - User authentication
- `GET /auth/me/` - Current user data
- `GET /equipment/` - List equipment (with filtering)
- `GET /equipment/available/` - Available equipment only
- `GET /loans/` - List loans (filtered by role permissions)
- `POST /loans/{id}/return_equipment/` - Process equipment return
- `GET /reservations/` - List reservations
- `POST /reservations/{id}/confirm/` - Confirm reservation
- `GET /dashboard/stats/` - Dashboard statistics

## Test Credentials

### Pre-created Users
- **Admin/Coordenador**: `admin@unihub.com` / `admin123`
- **Técnico**: `tecnico@unihub.com` / `tecnico123`
- **Secretária**: `secretaria@unihub.com` / `secretaria123`
- **Docente**: `ana.santos@unihub.com` / `docente123`

## Working with this Codebase

### Common Development Patterns
- **API Integration**: Use the pre-built API services in `src/lib/api.ts` 
- **New Pages**: Follow existing page patterns in `src/pages/`
- **Permission Checks**: Use `usePermissions` hook or check `user.role` directly
- **Styling**: Use Tailwind CSS with Shadcn/UI components
- **Forms**: React Hook Form with Zod validation (established pattern)

### Database Operations
- Equipment status changes update availability for loans/reservations
- Returning equipment sets loan status and frees equipment
- Reservations can be confirmed and converted to active loans
- All operations maintain referential integrity

### Backend Development
- Django REST Framework ViewSets for consistent API patterns
- Custom permissions classes for role-based access
- Model managers for common queries (available equipment, active loans)
- Database migrations handle schema changes safely

## Deployment Notes

### Frontend Deployment (Vercel/Netlify)
- Build command: `yarn build`
- Output directory: `dist`
- Environment variables: `VITE_API_BASE_URL`

### Backend Deployment (Railway/Heroku)
- Requirements: `backend/requirements.txt`
- Static files: WhiteNoise configured
- Database: MySQL connection via DATABASE_URL
- CORS: Configured for production domains

## Development Workflow

When adding new features:
1. Define TypeScript types in `src/types/index.ts`
2. Add API methods to appropriate service in `src/lib/api.ts`
3. Create/update Django models, serializers, views
4. Update frontend components to use real API data
5. Test with different user roles for permission validation
6. Ensure responsive design and proper error handling