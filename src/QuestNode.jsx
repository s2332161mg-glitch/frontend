import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data, id }) => {
  const { onNodeClick, isCompleted, label, subject } = data;
  const nodeClassName = `quest-node ${isCompleted ? 'completed' : ''}`;

  return (
    <div className={nodeClassName} onClick={() => onNodeClick(id, label)}>
      <Handle type="target" position={Position.Top} />

      {/* 教科を表示するタグを追加 */}
      {subject && <div className="subject-tag">{subject}</div>}

      <div className="quest-node-content">
        {label}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});