import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const api = (import.meta.env.VITE_API || `${location.protocol}//${location.hostname}:8000`).replace(/\/$/, "");
const uiBranch = __BRANCH__ || "unavailable";
const interval = Number(import.meta.env.VITE_INTERVAL || 5);

function App() {
  const [apiState, setApiState] = useState({ ok: false, branch: null, topic: null });
  const [events, setEvents] = useState("connecting");
  const [people, setPeople] = useState([]);
  const [progress, setProgress] = useState(1);
  const waiting = people.length ? `next image in ~${interval}s` : "waiting for event";
  const stats = [
    ["API", apiState.ok ? "connected" : "offline", apiState.ok],
    ["Events", events, events === "connected"],
    ["Status", waiting],
    ["UI branch", uiBranch],
    ["API branch", apiState.branch || "unavailable"],
    ["Kafka topic", apiState.topic || "unavailable"],
  ];

  useEffect(() => {
    let stopped = false;

    async function checkApi() {
      try {
        const res = await fetch(`${api}/health`);
        const data = await res.json();
        if (!stopped) setApiState({ ...data, ok: res.ok && data.ok });
      } catch {
        if (!stopped) setApiState({ ok: false, branch: null, topic: null });
      }
    }

    checkApi();
    const poll = setInterval(checkApi, 3000);
    const source = new EventSource(`${api}/events`);

    source.onopen = () => setEvents("connected");
    source.onerror = () => setEvents("disconnected");
    source.addEventListener("status", event => {
      const status = JSON.parse(event.data);
      setEvents(status.ok ? "connected" : "waiting for Kafka");
    });
    source.onmessage = event => {
      setEvents("connected");
      const person = JSON.parse(event.data);
      setPeople(list => [...list, { ...person, id: `${Date.now()}-${list.length}` }]);
    };

    return () => {
      stopped = true;
      clearInterval(poll);
      source.close();
    };
  }, []);

  useEffect(() => {
    const started = Date.now();
    setProgress(1);
    const timer = setInterval(() => {
      const done = ((Date.now() - started) / (interval * 1000)) * 100;
      setProgress(Math.min(100, Math.max(1, Math.round(done))));
    }, 80);
    return () => clearInterval(timer);
  }, [people.length]);

  return (
    <main>
      <section className="hero">
        <header>
          <h1>Employee of The Month: June</h1>
          <span className={apiState.ok ? "badge" : "badge-destructive"}>{apiState.ok ? "Live" : "Offline"}</span>
        </header>
        <section className="metrics">
          {stats.map(([title, value, ok]) => <Pill key={title} title={title} value={value} ok={ok} />)}
        </section>
      </section>

      <div className="preview">
        <section>
          <div className="avatar-line">
            {people.map(person => (
              <figure className="avatar" key={person.id}>
                <div className="avatar-shell">
                  <img src={`data:${person.content_type};base64,${person.image_b64}`} alt="Generated person" />
                </div>
              </figure>
            ))}
            <div className="next-card" key={people.length} style={{ "--progress": `${progress}%`, "--radius": `${progress}%` }}>
              <span className="loader-fill" />
              <strong>{progress}%</strong>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Pill({ title, value, ok }) {
  return (
    <article className="metric">
      {ok !== undefined && <span className={ok ? "state ok" : "state"} />}
      <small>{title}</small><strong>{value}</strong>
    </article>
  );
}

const root = import.meta.hot?.data.root || createRoot(document.getElementById("root"));
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<App />);
