import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import "./css/EditorNavbar.css";
class EditorNavbar extends Component {
  constructor(props) {
    super(props);
    this.state = { loading: true };
  }

  //bruh

  render() {
    const LoadingCircle = <React.Fragment>circle loading</React.Fragment>;
    return (
      <div
        style={{
          height: "50px",
          border: "3px solid black"
        }}
      >
        <a
          onClick={() => {
            this.props.history.push("/home");
          }}
        >
          &lt; home
        </a>
        saved
        {this.state.loading ? LoadingCircle : null}
      </div>
    );
  }
}

export default withRouter(EditorNavbar);
