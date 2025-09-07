import React from 'react';

function Header({ connected }) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-logo" />
        <div className="brand-name">AI Assistant</div>
      </div>
      <div className={"status-dot" + (connected ? "" : " status-off")} title={connected ? 'Connected' : 'Disconnected'} />
    </header>
  );
}

export default Header;

