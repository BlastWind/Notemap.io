import React from "react";
import logo from "./logo.svg";
import "./App.css";
import PageContainer from "./PageContainer.js";
import GraphEditor from "./GraphEditor.jsx";
import Home from "./Home.jsx";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

function App() {
  return (
    <React.Fragment>
      <Router>
        <Route path="/create" component={GraphEditor} />
        <Route path="/home" component={Home} />
      </Router>
    </React.Fragment>
  );
}

export default App;
