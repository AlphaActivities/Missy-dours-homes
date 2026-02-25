import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

console.log('[Load] React starting...', new Date().toISOString());

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

const rootElement = document.getElementById('root')!;

console.log('[Load] Creating React root...', new Date().toISOString());

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

console.log('[Load] React render complete', new Date().toISOString());

setTimeout(() => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => {
      if (loader.parentNode) {
        loader.parentNode.removeChild(loader);
        console.log('[Load] Initial loader removed');
      }
    }, 300);
  }
}, 100);
