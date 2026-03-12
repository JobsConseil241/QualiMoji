import { createRoot } from 'react-dom/client';
import App from './App';
import '../css/app.css';

// Initialize theme from localStorage before render to prevent flash
const stored = localStorage.getItem('theme');
if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')!).render(<App />);
