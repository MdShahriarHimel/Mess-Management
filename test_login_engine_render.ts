import React from 'react';
import { renderToString } from 'react-dom/server';
import { LoginEnginePanel } from './src/components/LoginEnginePanel.tsx';

try {
  renderToString(React.createElement(LoginEnginePanel, { loginCustomization: {}, isDarkMode: true }));
  console.log("Rendered successfully");
} catch (e) {
  console.log("ERROR:", e.message, e.stack);
}
