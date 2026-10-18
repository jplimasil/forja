import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import { App } from './App';
import { AppQueryProvider } from './lib/queryClient';
import { ToastProvider } from './ui/Toast';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppQueryProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AppQueryProvider>
  </StrictMode>,
);
