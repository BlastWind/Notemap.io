import React, { Component } from "react";
import GraphEditor from "./GraphEditor.jsx";
class GraphWrapper extends Component {
  constructor(props) {
    super(props);
    this.state = {
      editorMode: "normal"
    };
  }

  appendData = data => {
    this.setState({
      graphData: [
        ...this.state.graphData,
        { radius: 10, x: data[0], y: data[1] }
      ]
    });
  };

  appendNode = data => {
    this.setState({
      nodes: [...this.state.nodes, data]
    });
  };

  toggle = () => {
    this.setState({
      editorMode: this.state.editorMode === "normal" ? "link" : "normal"
    });
  };

  render() {
    return (
      <React.Fragment>
        <div>{this.state.editorMode}</div>
        <div>
          <button onClick={this.toggle}>Toggle State</button>
        </div>
        <GraphEditor
          size={[500, 500]}
          editorMode={this.state.editorMode}
          appendData={this.appendData}
          appendNode={this.appendNode}
        />
      </React.Fragment>
    );
  }
}

export default GraphWrapper;
