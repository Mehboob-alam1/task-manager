import React from 'react';

export const TestComponent: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#333' }}>React is Working!</h1>
      <p>If you see this, React is rendering correctly.</p>
      <p>Check the browser console for any errors.</p>
    </div>
  );
};

