const React = require('react');
const ReactDOMServer = require('react-dom/server');

try {
  // Simulate jsx(Image, {})
  const element = React.createElement(Image, {});
  ReactDOMServer.renderToString(element);
} catch (e) {
  console.log("CATCH:", e.message);
}
