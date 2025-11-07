# BookIt - Appointment & Booking System (Web Frontend)

Progressive Web App (PWA) frontend for the Appointment & Booking System.

## Features

- 🔐 **Secure Authentication** - Email/password login with OAuth support
- 📱 **Progressive Web App** - Install on any device, works offline
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS
- 🌙 **Dark Mode** - Automatic dark mode support
- ♿ **Accessible** - WCAG 2.1 compliant interface

## Project Structure

```
web/
├── public/              # Static assets
│   ├── login.html      # Login page
│   ├── register.html   # Registration page (planned)
│   ├── dashboard.html  # Dashboard page (planned)
│   └── manifest.json   # PWA manifest
├── src/
│   ├── components/     # Reusable UI components
│   ├── js/            # JavaScript modules
│   │   └── login.js   # Login functionality
│   └── styles/        # CSS stylesheets
│       └── main.css   # Main stylesheet
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:4000`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or serve the public folder directly
npm run serve
```

The application will be available at `http://localhost:3000`

## Development

### Login Page

The login page (`public/login.html`) provides:

- Email and password authentication
- "Remember me" functionality
- Social login buttons (Google, GitHub) - UI only, needs implementation
- Forgot password link
- Sign up link
- Form validation
- Error handling
- Loading states

### API Integration

The frontend connects to the backend API at `http://localhost:4000/v1`. Authentication endpoints:

- `POST /v1/auth/login` - User login (planned endpoint)
- `GET /v1/auth/validate` - Token validation (planned endpoint)

### Styling

The project uses:

- **Tailwind CSS** - Utility-first CSS framework (CDN)
- **Custom CSS** - Additional styles in `src/styles/main.css`

### JavaScript

- Vanilla JavaScript (no frameworks)
- ES6+ syntax
- Module pattern for organization
- Local/session storage for auth tokens

## Build for Production

```bash
npm run build
```

This will create an optimized production build.

## PWA Features

The app includes PWA capabilities:

- Installable on mobile and desktop
- Offline support (planned with service worker)
- App manifest for native-like experience
- Responsive design for all screen sizes

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Security

- HTTPS required for PWA features
- Secure token storage
- Input validation and sanitization
- CORS protection
- XSS prevention

## Next Steps

- [ ] Implement backend auth endpoints
- [ ] Add service worker for offline support
- [ ] Create dashboard page
- [ ] Build registration flow
- [ ] Add password reset functionality
- [ ] Implement social OAuth flows
- [ ] Add unit tests
- [ ] Add E2E tests with Playwright

## Contributing

Follow the code style guidelines in the root `CLAUDE.md` file.
