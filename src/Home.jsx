import React, { Component } from "react";
import { withRouter } from "react-router-dom";
class Home extends Component {
  render() {
    return (
      <div>
        This isyour home
        <a
          style={{ text: "underline", color: "blue", cursor: "pointer" }}
          onClick={() => {
            this.props.history.push("/create");
          }}
        >
          go to GraphEditor
        </a>
      </div>
    );
  }
}

export default withRouter(Home);
