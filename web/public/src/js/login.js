/**
 * Login Page JavaScript
 * Handles user authentication and form submission
 */

// API Configuration
const API_BASE_URL = 'http://localhost:4000/v1';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

// State
let isLoading = false;

/**
 * Initialize the login page
 */
function init() {
  // Check if user is already logged in
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (token) {
    // Validate token and redirect if valid
    validateTokenAndRedirect(token);
  }

  // Pre-fill email if remembered
  const rememberedEmail = localStorage.getItem('rememberedEmail');
  if (rememberedEmail) {
    emailInput.value = rememberedEmail;
    rememberCheckbox.checked = true;
  }

  // Add event listeners
  loginForm.addEventListener('submit', handleLogin);
  emailInput.addEventListener('input', clearError);
  passwordInput.addEventListener('input', clearError);

  // Add keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
}

/**
 * Handle form submission
 */
async function handleLogin(e) {
  e.preventDefault();

  if (isLoading) return;

  // Get form values
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const remember = rememberCheckbox.checked;

  // Validate inputs
  if (!validateInputs(email, password)) {
    return;
  }

  // Show loading state
  setLoading(true);

  try {
    // Call login API
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed. Please try again.');
    }

    // Store authentication token
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('authToken', data.data.token);
    storage.setItem('refreshToken', data.data.refreshToken);
    storage.setItem('user', JSON.stringify(data.data.user));

    // Remember email if checkbox is checked
    if (remember) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    // Show success and redirect
    showSuccess('Login successful! Redirecting...');

    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1000);

  } catch (error) {
    console.error('Login error:', error);
    showError(error.message || 'Login failed. Please check your credentials and try again.');
  } finally {
    setLoading(false);
  }
}

/**
 * Validate form inputs
 */
function validateInputs(email, password) {
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    showError('Please enter your email address.');
    emailInput.focus();
    return false;
  }
  if (!emailRegex.test(email)) {
    showError('Please enter a valid email address.');
    emailInput.focus();
    return false;
  }

  // Password validation
  if (!password) {
    showError('Please enter your password.');
    passwordInput.focus();
    return false;
  }
  if (password.length < 6) {
    showError('Password must be at least 6 characters long.');
    passwordInput.focus();
    return false;
  }

  return true;
}

/**
 * Validate existing token and redirect
 */
async function validateTokenAndRedirect(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      // Token is valid, redirect to dashboard
      window.location.href = '/dashboard.html';
    } else {
      // Token is invalid, clear it
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
    }
  } catch (error) {
    console.error('Token validation error:', error);
  }
}

/**
 * Show error message
 */
function showError(message) {
  errorText.textContent = message;
  errorMessage.classList.remove('hidden');
  errorMessage.classList.add('animate-slide-down');

  // Add shake animation to form
  loginForm.classList.add('shake');
  setTimeout(() => {
    loginForm.classList.remove('shake');
  }, 500);
}

/**
 * Show success message
 */
function showSuccess(message) {
  errorMessage.classList.remove('hidden', 'bg-red-100', 'border-red-400', 'text-red-700');
  errorMessage.classList.add('bg-green-100', 'border-green-400', 'text-green-700');
  errorText.textContent = message;
}

/**
 * Clear error message
 */
function clearError() {
  errorMessage.classList.add('hidden');
  errorMessage.classList.remove('bg-green-100', 'border-green-400', 'text-green-700');
  errorMessage.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
}

/**
 * Set loading state
 */
function setLoading(loading) {
  isLoading = loading;

  if (loading) {
    loginBtn.disabled = true;
    loginBtn.classList.add('btn-loading');
    loginBtn.textContent = '';
    emailInput.disabled = true;
    passwordInput.disabled = true;
  } else {
    loginBtn.disabled = false;
    loginBtn.classList.remove('btn-loading');
    loginBtn.textContent = 'Sign in';
    emailInput.disabled = false;
    passwordInput.disabled = false;
  }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboard(e) {
  // Escape key clears error
  if (e.key === 'Escape') {
    clearError();
  }
}

// Add shake animation CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
  .shake {
    animation: shake 0.5s ease-in-out;
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateInputs,
    showError,
    showSuccess,
    clearError,
  };
}
