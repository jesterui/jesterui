import React from 'react';
import './App.css';
import AppNavbar from './components/AppNavbar';
//import Chessboard from './components/Chessboard'
import Chessboard from './components/chessground/Chessground'

function App() {
  return (
    <div className="App">
    <header className="App-header w-full">
      <AppNavbar />
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
