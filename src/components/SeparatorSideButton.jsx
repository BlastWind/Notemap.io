import React from "react";
import {
  EditorState,
  convertToRaw,
  convertFromRaw,
  KeyBindingUtil,
  Modifier,
  AtomicBlockUtils
} from "draft-js";
export default class SeparatorSideButton extends React.Component {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    let editorState = this.props.getEditorState();
    const content = editorState.getCurrentContent();
    const contentWithEntity = content.createEntity(
      "separator",
      "IMMUTABLE",
      {}
    );
    const entityKey = contentWithEntity.getLastCreatedEntityKey();
    editorState = EditorState.push(
      editorState,
      contentWithEntity,
      "create-entity"
    );
    this.props.setEditorState(
      AtomicBlockUtils.insertAtomicBlock(editorState, entityKey, "-")
    );
    this.props.close();
  }

  render() {
    return (
      <button
        className="md-sb-button md-sb-img-button"
        type="button"
        title="Add a separator"
        onClick={this.onClick}
      >
        <i className="fa fa-minus" />
      </button>
    );
  }
}
