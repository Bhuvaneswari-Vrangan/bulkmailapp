import { useEffect, useState } from "react";
import { HashRouter } from 'react-router-dom'
import Login from "./pages/Login.jsx";
import Compose from "./pages/Compose.jsx";
import History from "./pages/History.jsx";
import { clearToken, getToken } from "./api.js";

function Protected({ authed, children }) {
  return authed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const navigate = useNavigate();

  useEffect(() => {
    const onExpired = () => {
      setAuthed(false);
      navigate("/login");
    };
    window.addEventListener("auth-expired", onExpired);
    return () => window.removeEventListener("auth-expired", onExpired);
  }, [navigate]);

  const logout = () => {
    clearToken();
    setAuthed(false);
    navigate("/login");
  };

  return (
    <>
      {authed && (
        <header className="topbar">
          <div className="brand">✉ Bulk Mail</div>
          <nav>
            <NavLink to="/compose">Compose</NavLink>
            <NavLink to="/history">History</NavLink>
          </nav>
          <button className="btn ghost" onClick={logout}>
            Log out
          </button>
        </header>
      )}
      <main className="container">
        <Routes>
          <Route
            path="/login"
            element={
              authed ? (
                <Navigate to="/compose" replace />
              ) : (
                <Login
                  onLogin={() => {
                    setAuthed(true);
                    navigate("/compose");
                  }}
                />
              )
            }
          />
          <Route path="/compose" element={<Protected authed={authed}><Compose /></Protected>} />
          <Route path="/history" element={<Protected authed={authed}><History /></Protected>} />
          <Route path="*" element={<Navigate to={authed ? "/compose" : "/login"} replace />} />
        </Routes>
      </main>
    </>
  );
}
