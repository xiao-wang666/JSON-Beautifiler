/**
 * SearchBar: provides a search input with match count display and next/prev
 * navigation for locating matching nodes in the JSON tree.
 *
 * Props are driven by appReducer's search sub-state and dispatched actions:
 * - `setQuery` updates the query and recomputes matches
 * - `nextMatch` / `prevMatch` cycle through match results
 *
 * After a match is selected, the TreeView scrolls to the corresponding node.
 * Clearing the query removes all highlights (Requirement 7.6).
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { Input, Button } from "antd";
import { UpOutlined, DownOutlined } from "@ant-design/icons";
import { useAppContext } from "./appContext";

export function SearchBar() {
  const { state, dispatch } = useAppContext();
  const { query, matches, currentIndex } = state.search;

  const matchCount = matches.length;

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "setQuery", query: e.target.value });
  };

  const handleNext = () => {
    dispatch({ type: "nextMatch" });
  };

  const handlePrev = () => {
    dispatch({ type: "prevMatch" });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  return (
    <div className="jb-search-bar" role="search" aria-label="搜索">
      <Input
        className="jb-search-input"
        value={query}
        onChange={handleQueryChange}
        onKeyDown={handleKeyDown}
        placeholder="搜索键名或值…"
        aria-label="搜索查询"
      />

      {query.trim() !== "" && (
        <span
          className="jb-search-count"
          aria-live="polite"
          style={{ whiteSpace: "nowrap", fontSize: 12 }}
        >
          {matchCount > 0 ? `${currentIndex + 1}/${matchCount}` : "0"}
        </span>
      )}

      <Button
        size="small"
        icon={<UpOutlined />}
        onClick={handlePrev}
        disabled={matchCount === 0}
        aria-label="上一个匹配"
        title="上一个匹配"
        style={{ minWidth: 32, minHeight: 32 }}
      />

      <Button
        size="small"
        icon={<DownOutlined />}
        onClick={handleNext}
        disabled={matchCount === 0}
        aria-label="下一个匹配"
        title="下一个匹配"
        style={{ minWidth: 32, minHeight: 32 }}
      />
    </div>
  );
}
