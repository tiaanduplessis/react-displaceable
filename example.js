import React from "react";
import ReactDOM from "react-dom";
import Displaceable from "react-displaceable";

import "./styles.css";

function App() {
  return (
    <div className="App">
      <Displaceable
        displaceFactor={5}
        // Other options are also supported
        // See: https://github.com/dinohamzic/displaceable#configuration
      >
        <h1>Hello There!</h1>
      </Displaceable>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
