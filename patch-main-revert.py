import re

with open('src/main.tsx', 'r') as f:
    content = f.read()

replacement = """import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
"""

with open('src/main.tsx', 'w') as f:
    f.write(replacement)
