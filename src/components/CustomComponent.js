import React, { Component } from "react";
import { EditorBlock } from "draft-js";
class CustomComponent extends Component {
  render() {
    return (
      <div style={{ color: "red" }}>
        <EditorBlock {...this.props} />
      </div>
    );
  }
}

export default CustomComponent;
