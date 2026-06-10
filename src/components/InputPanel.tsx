/**
 * InputPanel — controlled textarea for JSON input with debounced dispatch.
 *
 * Uses local state for immediate responsiveness and a debounced effect to
 * dispatch `setInput` to the app reducer (~300ms after the user stops typing).
 * When a parse error exists, highlights the error position in the textarea.
 *
 * Requirements: 4.1, 4.2, 5.1
 */

import { useEffect, useRef, useState } from "react";
import { Input } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { useAppContext } from "./appContext";

const DEBOUNCE_MS = 300;

export function InputPanel() {
  const { state, dispatch } = useAppContext();
  const textareaRef = useRef<TextAreaRef>(null);

  // Local state for immediate textarea responsiveness.
  const [localValue, setLocalValue] = useState(state.inputText);

  // Sync local state when external state changes (e.g. initial load).
  useEffect(() => {
    setLocalValue(state.inputText);
  }, [state.inputText]);

  // Debounced dispatch of setInput.
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "setInput", text: localValue });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [localValue, dispatch]);

  // When error occurs, position cursor at error offset (only on new errors)
  const prevErrorRef = useRef<typeof state.error>(null);
  useEffect(() => {
    if (!state.error) {
      prevErrorRef.current = null;
      return;
    }
    // Only trigger when error changes (not on every keystroke)
    if (state.error === prevErrorRef.current) return;
    prevErrorRef.current = state.error;

    const el = textareaRef.current?.resizableTextArea?.textArea;
    if (!el) return;

    const offset = state.error.offset;
    const text = localValue;
    let end = text.indexOf("\n", offset);
    if (end === -1) end = text.length;
    const selEnd = Math.min(end, offset + Math.max(1, end - offset));

    // Use setTimeout to avoid interfering with the current input event
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(offset, selEnd);
    }, 50);
  }, [state.error]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasError = !!state.error;

  return (
    <Input.TextArea
      ref={textareaRef}
      className="jb-input-textarea"
      aria-label="JSON 输入"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder='粘贴 JSON 或 JS 对象字面量，例如 {"name": "value"}'
      spellCheck={false}
      autoSize={false}
      status={hasError ? "error" : undefined}
      style={{ height: "100%", resize: "none" }}
    />
  );
}
