/** src/main.jsx */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './assets/components.css';
import './assets/pages.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
