import * as d3 from "d3";
import React, { Component } from "react";
import "../styles/ColorCard.css";

const ColorCardContent = ({
  opacity,
  colors,
  numbers,
  selectedBackgroundColor,
  selectedStrokeColor,
  selectedNumber
}) => (
  <div
    class="colorCardContainer"
    style={{ visibility: opacity === 1 ? "visible" : "hidden" }}
  >
    <div class="colorCardContainerInner">
      <div>
        <a class="colorCardA">Background Color</a>
      </div>
      <div class="backgroundColorGrid">
        {colors.map(eachColor =>
          eachColor === selectedBackgroundColor ? (
            <div
              class="backgroundColorBlock selected"
              style={{ backgroundColor: eachColor }}
            ></div>
          ) : (
            <div
              class="backgroundColorBlock"
              style={{ backgroundColor: eachColor }}
            ></div>
          )
        )}
      </div>
      <div>
        <a class="colorCardA">Stroke Color</a>
      </div>
      <div class="strokeColorGrid">
        {colors.map(eachColor =>
          eachColor === selectedStrokeColor ? (
            <div
              class="strokeColorBlock selected"
              style={{ backgroundColor: eachColor }}
            ></div>
          ) : (
            <div
              class="strokeColorBlock"
              style={{ backgroundColor: eachColor }}
            ></div>
          )
        )}
      </div>
      <div>
        <a class="colorCardA">Set Group ID to use Theming</a>
      </div>

      <div class="numberGrid">
        {numbers.map((_, i) =>
          i === selectedNumber ? (
            <div class="numberBlock selectedNumber">{i}</div>
          ) : (
            <div class="numberBlock">{i}</div>
          )
        )}
      </div>
    </div>
  </div>
);

export default class ColorCard extends React.Component {
  constructor(props) {
    super(props);
  }
  componentDidMount() {}

  render() {
    const colorArray = d3.schemeCategory10.slice(0, 8);
    const numberArray = [0, 1, 2, 3, 4, 5];
    //WARNING: replace selected with your selected to render selected ele
    const selected = d3.schemeCategory10[0];
    const selected2 = d3.schemeCategory10[1];

    return (
      <ColorCardContent
        opacity={this.props.opacity}
        colors={colorArray}
        numbers={numberArray}
        selectedBackgroundColor={selected}
        selectedStrokeColor={selected2}
        selectedNumber={0}
      />
    );
  }
}
