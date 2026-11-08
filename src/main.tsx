import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { RoleProvider } from './live/context/RoleContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <RoleProvider>
    <App />
  </RoleProvider>,
);
