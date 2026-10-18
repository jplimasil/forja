import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { AppQueryProvider } from './lib/queryClient';
import { ToastProvider } from './ui/Toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppQueryProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AppQueryProvider>
  </StrictMode>,
);
