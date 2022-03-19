import React from 'react';
import './App.css';
import Chessboard from './components/Chessboard'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <Chessboard />
      </header>
    </div>
  );
}

export default App;
