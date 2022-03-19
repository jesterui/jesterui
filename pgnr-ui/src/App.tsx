import React from 'react';
import './App.css';
import Chessboard from './components/Chessboard'

function App() {
  return (
    <div className="App">
    <header className="App-header">
    </header>
    <section className="App-container">
      <Chessboard />
    </section>
    <footer className="App-footer">
      <a className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer">
        View on GitHub
      </a>
    </footer>

    </div>
  );
}

export default App;
