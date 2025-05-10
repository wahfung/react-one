import React from "react";
import logo from "./logo.svg";
import "./App.css";
import { DisplayLocations } from "./displayLocations";
import TextGeneration from "./TextGeneration";

const styles = {
  main: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
  },
  section: {
    marginBottom: "40px",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    borderBottom: "2px solid #eaeaea",
    paddingBottom: "8px",
    marginBottom: "20px",
  },
};

function App(): React.ReactElement {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>佳哥NB</h1>
        <main style={styles.main}>
          <section style={styles.section}>
            <TextGeneration />
          </section>
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>位置列表</h2>
            <DisplayLocations />
          </section>
        </main>
      </header>
    </div>
  );
}

export default App;
