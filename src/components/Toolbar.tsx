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

import { useState } from "react";
import { Button, Space, message } from "antd";
import {
  CopyOutlined,
  PlusSquareOutlined,
  MinusSquareOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useAppContext } from "./appContext";
import { prettyPrint } from "../core/printer";

export function Toolbar() {
  const { state, dispatch } = useAppContext();
  const [expanded, setExpanded] = useState(true);

  const handleCopy = async () => {
    const text = prettyPrint(state.model);
    try {
      await navigator.clipboard.writeText(text);
      message.success("已复制到剪贴板");
    } catch {
      message.error("复制失败");
    }
  };

  const handleToggleAll = () => {
    if (expanded) {
      dispatch({ type: "collapseAll" });
    } else {
      dispatch({ type: "expandAll" });
    }
    setExpanded(!expanded);
  };

  const handleNewWindow = () => {
    // 打开一个独立的新窗口，用于多开对比不同 JSON
    window.open(
      window.location.href,
      "_blank",
      "noopener,noreferrer,width=1200,height=800",
    );
  };

  return (
    <div className="jb-toolbar" role="toolbar" aria-label="工具栏">
      <Space>
        <Button icon={<CopyOutlined />} onClick={handleCopy} aria-label="复制">
          复制
        </Button>
        <Button
          icon={expanded ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
          onClick={handleToggleAll}
          aria-label={expanded ? "全部折叠" : "全部展开"}
        >
          {expanded ? "全部折叠" : "全部展开"}
        </Button>
        <Button
          icon={<PlusOutlined />}
          onClick={handleNewWindow}
          aria-label="新建窗口"
          title="打开新窗口（多开对比）"
        >
          新建窗口
        </Button>
      </Space>
    </div>
  );
}
