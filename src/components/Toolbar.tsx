/**
 * Toolbar — copy, expand-all, collapse-all buttons.
 *
 * - Copy: writes `prettyPrint(state.model)` to the clipboard via
 *   `navigator.clipboard.writeText`. Handles null model gracefully (copies
 *   empty string).
 * - Expand All: dispatches `expandAll` to clear all collapsed paths.
 * - Collapse All: dispatches `collapseAll` to collapse all container nodes.
 *
 * Requirements: 4.3, 4.4, 4.5
 */

import { Button, Space } from "antd";
import {
  CopyOutlined,
  ExpandOutlined,
  CompressOutlined,
} from "@ant-design/icons";
import { useAppContext } from "./appContext";
import { prettyPrint } from "../core/printer";

export function Toolbar() {
  const { state, dispatch } = useAppContext();

  const handleCopy = async () => {
    const text = prettyPrint(state.model);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard write failed — best effort, no crash.
    }
  };

  const handleExpandAll = () => {
    dispatch({ type: "expandAll" });
  };

  const handleCollapseAll = () => {
    dispatch({ type: "collapseAll" });
  };

  return (
    <div className="jb-toolbar" role="toolbar" aria-label="工具栏">
      <Space>
        <Button icon={<CopyOutlined />} onClick={handleCopy} aria-label="复制">
          复制
        </Button>
        <Button
          icon={<ExpandOutlined />}
          onClick={handleExpandAll}
          aria-label="全部展开"
        >
          全部展开
        </Button>
        <Button
          icon={<CompressOutlined />}
          onClick={handleCollapseAll}
          aria-label="全部折叠"
        >
          全部折叠
        </Button>
      </Space>
    </div>
  );
}
