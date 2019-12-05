import React from "react";
import {
  // Editor,
  EditorState,
  RichUtils
} from "draft-js";
import Editor, { createEditorStateWithText } from "draft-js-plugins-editor";
import createHighlightPlugin from "./components/plugins/highlightPlugin";
import EditorCSS from "./PageContainer.css";

const highlightPlugin = createHighlightPlugin();

class PageContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editorState: EditorState.createEmpty()
    };

    this.plugins = [highlightPlugin];
  }

  componentDidMount() {
    this.refs.editorRef.focus();
  }

  onChange = editorState => {
    this.setState({
      editorState
    });
  };

  handleKeyCommand = command => {
    const newState = RichUtils.handleKeyCommand(
      this.state.editorState,
      command
    );
    if (newState) {
      this.onChange(newState);
      return "handled";
    }
    return "not-handled";
  };

  onUnderlineClick = () => {
    this.onChange(
      RichUtils.toggleInlineStyle(this.state.editorState, "UNDERLINE")
    );
  };

  onBoldClick = e => {
    e.preventDefault();
    this.onChange(RichUtils.toggleInlineStyle(this.state.editorState, "BOLD"));
  };

  onItalicClick = () => {
    this.onChange(
      RichUtils.toggleInlineStyle(this.state.editorState, "ITALIC")
    );
  };

  onStrikeThroughClick = () => {
    this.onChange(
      RichUtils.toggleInlineStyle(this.state.editorState, "STRIKETHROUGH")
    );
  };

  onHighlight = () => {
    this.onChange(
      RichUtils.toggleInlineStyle(this.state.editorState, "HIGHLIGHT")
    );
  };

  onTxtToNode = () => {
    function _getTextSelection(contentState, selection, blockDelimiter) {
      blockDelimiter = blockDelimiter || "\n";
      var startKey = selection.getStartKey();
      var endKey = selection.getEndKey();
      var blocks = contentState.getBlockMap();

      var lastWasEnd = false;
      var selectedBlock = blocks
        .skipUntil(function(block) {
          return block.getKey() === startKey;
        })
        .takeUntil(function(block) {
          var result = lastWasEnd;

          if (block.getKey() === endKey) {
            lastWasEnd = true;
          }

          return result;
        });

      return selectedBlock
        .map(function(block) {
          var key = block.getKey();
          var text = block.getText();

          var start = 0;
          var end = text.length;

          if (key === startKey) {
            start = selection.getStartOffset();
          }
          if (key === endKey) {
            end = selection.getEndOffset();
          }

          text = text.slice(start, end);
          return text;
        })
        .join(blockDelimiter);
    }
    let editorState = this.state.editorState;

    var text = _getTextSelection(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      null
    );

    var style = "";
    if (this.state.editorState.getCurrentInlineStyle().has("BOLD"))
      style += "bold";
    if (this.state.editorState.getCurrentInlineStyle().has("HIGHLIGHT"))
      style += "highlight";
    if (this.state.editorState.getCurrentInlineStyle().has("ITALIC"))
      style += "italic";

    if (text) {
      this.props.onTxtToNode(text, style);
    }
  };

  render() {
    return (
      <div className="textEditorContainer">
        <button
          id="bold"
          className="PageContainerButton"
          onClick={this.onBoldClick}
        >
          <b>B</b>
        </button>
        <button
          id="italic"
          className="PageContainerButton"
          onClick={this.onItalicClick}
        >
          <em>I</em>
        </button>
        <button
          id="highlight"
          className="PageContainerButton"
          onClick={this.onHighlight}
        >
          <span>H</span>
        </button>
        <button
          id="textToNode"
          className="PageContainerButton"
          onClick={this.onTxtToNode}
        >
          <span> Text To Nodes</span>
        </button>
        <div
          className="editors"
          style={{
            width: "90%",
            marginLeft: "auto",
            marginRight: "auto",
            marginTop: "3rem"
          }}
        >
          <Editor
            ref="editorRef"
            editorState={this.state.editorState}
            handleKeyCommand={this.handleKeyCommand}
            plugins={this.plugins}
            onChange={this.onChange}
          />
        </div>
      </div>
    );
  }
}

export default PageContainer;
