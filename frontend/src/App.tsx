import { useState } from 'react';
import './App.css';
import { FloorAvailabilityPage } from './pages/FloorAvailabilityPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    // TODO: Implement actual login logic
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <h2>Login</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" defaultValue="test@example.com" />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" defaultValue="password" />
          </div>
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return <FloorAvailabilityPage />;
}

export default App;