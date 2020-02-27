import * as d3 from "d3";
import React, { Component } from "react";
import "../styles/ColorCard.css";

export default class ColorCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { textSize: this.props.textSize };
  }
  componentWillReceiveProps(newProps) {
    this.setState({ textSize: newProps.textSize });
  }

  textSizeDecrement = () => {
    if (this.state.textSize >= 11) {
      this.props.changeTextSize(this.state.textSize - 1);
      this.setState({ textSize: this.state.textSize - 1 });
    }
  };

  textSizeIncrement = () => {
    if (this.state.textSize <= 29) {
      this.props.changeTextSize(this.state.textSize + 1);
      this.setState({ textSize: this.state.textSize + 1 });
    }
  };

  onSubmit = e => {
    console.log(e.target.value);
    if (e.target.value <= 30 && e.target.value >= 10) {
      this.setState({ textSize: e.target.value });
      this.props.changeTextSize(e.target.value);
    } else {
      this.setState({ textSize: this.props.textSize });
    }
  };

  changeBackgroundColor = color => {
    console.log("clicked color", color);
    this.props.changeBackgroundColor(color);
  };

  changeStrokeColor = color => {
    this.props.changeStrokeColor(color);
  };

  onChange = e => {
    this.setState({ textSize: e.target.value });
  };

  render() {
    const backgroundColorArray = ["white", "black"].concat(
      d3.schemeCategory10.slice(0, 6)
    );
    const strokeColorArray = ["white", "black"].concat(
      d3.schemeCategory10.slice(0, 6)
    );
    const numberArray = [0, 1, 2, 3, 4, 5];
    //WARNING: replace selected with your selected to render selected ele
    const selected = d3.schemeCategory10[0];
    const selected2 = d3.schemeCategory10[1];

    const numbers = numberArray;

    const selectedNumber = 0;

    var selectedBackgroundColor = this.props.selectedNode.backgroundColor;
    var selectedStrokeColor = this.props.selectedNode.strokeColor;

    return (
      <React.Fragment>
        <div
          className={
            this.props.type && this.props.type === "text"
              ? "colorCardContainer text"
              : "colorCardContainer"
          }
        >
          <div className="colorCardContainerInner">
            <div>
              <a className="colorCardA">Background Color</a>
            </div>
            <div className="backgroundColorGrid">
              {backgroundColorArray.map(eachColor =>
                eachColor === selectedBackgroundColor ? (
                  <div
                    className="backgroundColorBlock selected"
                    style={{ backgroundColor: eachColor }}
                  ></div>
                ) : (
                  <div
                    className="backgroundColorBlock"
                    style={{ backgroundColor: eachColor }}
                    onClick={() => {
                      this.changeBackgroundColor(eachColor);
                    }}
                  ></div>
                )
              )}
            </div>
            <div>
              <a className="colorCardA">Stroke Color</a>
            </div>
            <div className="strokeColorGrid">
              {strokeColorArray.map(eachColor =>
                eachColor === selectedStrokeColor ? (
                  <div
                    className="strokeColorBlock selected"
                    style={{ backgroundColor: eachColor }}
                  ></div>
                ) : (
                  <div
                    className="strokeColorBlock"
                    style={{ backgroundColor: eachColor }}
                    onClick={() => {
                      this.changeStrokeColor(eachColor);
                    }}
                  ></div>
                )
              )}
            </div>

            {this.props.type && this.props.type === "text" ? (
              <div>
                <a className="colorCardA">Text Size</a>
                <div className="textSizeContainer">
                  <span
                    className="input-number-decrement"
                    onClick={this.textSizeDecrement}
                  >
                    –
                  </span>
                  <input
                    className="input-number"
                    type="integer"
                    value={this.state.textSize}
                    onChange={this.onChange}
                    onBlur={this.onSubmit}
                    min="0"
                    max="30"
                  />
                  <span
                    className="input-number-increment"
                    onClick={this.textSizeIncrement}
                  >
                    +
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </React.Fragment>
    );
  }
}
