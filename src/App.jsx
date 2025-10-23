import { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, { Controls, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';
import dagre from 'dagre';
import QuestNode from './QuestNode.jsx';
import QuestModal from './QuestModal.jsx';
import HistorySidebar from './HistorySidebar.jsx';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 300;
const nodeHeight = 100;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction });
  nodes.forEach((node) => { dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight }); });
  edges.forEach((edge) => { dagreGraph.setEdge(edge.source, edge.target); });
  dagre.layout(dagreGraph);
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = 'top';
    node.sourcePosition = 'bottom';
    node.position = { x: nodeWithPosition.x - nodeWidth / 2, y: nodeWithPosition.y - nodeHeight / 2, };
    return node;
  });
  return { nodes, edges };
};

const nodeTypes = {
  default: QuestNode,
  input: QuestNode,
};

function App() {
  const [question, setQuestion] = useState('');
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuest, setActiveQuest] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);

  const [questHistory, setQuestHistory] = useState([]);
  const [activeQuestId, setActiveQuestId] = useState(null);

  // --- ここからが新しい部分 ---
  // アプリ起動時に一度だけ履歴をサーバーから取得する
  useEffect(() => {
    fetch('http://localhost:8081/history')
      .then(res => res.json())
      .then(data => setQuestHistory(data))
      .catch(err => console.error("履歴の取得に失敗:", err));
  }, []);
  // --- ここまでが新しい部分 ---

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const handleNodeClick = useCallback(async (nodeId, nodeLabel) => {
    const targetNode = nodes.find(n => n.id === nodeId);
    if ((targetNode && targetNode.data.isCompleted) || isLoading) {
      return;
    }
    setIsLoading(true);
    setActiveNodeId(nodeId);
    try {
      const response = await fetch('http://localhost:8081/get-quest-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questText: nodeLabel }),
      });
      if (!response.ok) throw new Error("クエスト詳細の取得に失敗しました。");
      const data = await response.json();
      setActiveQuest(data);
    } catch (error) {
      console.error("詳細取得エラー:", error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [nodes, isLoading]);

  const handleQuizSubmit = (quizIndex, userAnswer) => {
    if (activeQuest && userAnswer.trim().toLowerCase() === activeQuest.quizzes[quizIndex].answer.trim().toLowerCase()) {
      const allQuizzes = activeQuest.quizzes;
      if (quizIndex === allQuizzes.length - 1) {
        setNodes((prevNodes) =>
          prevNodes.map((node) =>
            node.id === activeNodeId ? { ...node, data: { ...node.data, isCompleted: true } } : node
          )
        );

        fetch('http://localhost:8081/complete-quest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', },
          body: JSON.stringify({ id: activeNodeId }),
        }).catch(err => console.error("通知エラー:", err));

        setTimeout(() => {
          setActiveQuest(null);
          setActiveNodeId(null);
        }, 2000);
      }
      return true;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question || question.trim().length < 2) {
      alert('2文字以上で質問を入力してください。');
      return;
    }
    setIsLoading(true);
    setActiveQuest(null);
    try {
      // サーバー側で保存されるので、フロント側での履歴追加は不要に
      await fetch(`http://localhost:8081/generate-quest?question=${encodeURIComponent(question)}`);

      // 履歴を再取得してサイドバーを更新
      const historyResponse = await fetch('http://localhost:8081/history');
      const newHistory = await historyResponse.json();
      setQuestHistory(newHistory);

      // 作成された最新のクエスト（履歴の先頭）を表示する
      if (newHistory.length > 0) {
        handleSelectQuest(newHistory[0].id);
      }
      setQuestion(''); // 入力欄をクリア

    } catch (error) {
      console.error('通信エラー:', error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuest = async (questId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8081/quest/${questId}`);
      const data = await response.json();
      const initialNodes = data.filter(item => !item.source);
      const initialEdges = data.filter(item => item.source);

      initialNodes.forEach(node => {
        node.data.onNodeClick = handleNodeClick;
      });

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setActiveQuestId(questId);
    } catch (error) {
      console.error("クエストの読み込みに失敗:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const completedCount = useMemo(() => {
    return nodes.filter(node => node.data.isCompleted).length;
  }, [nodes]);

  const totalQuests = useMemo(() => {
    return nodes.filter(node => node.id !== 'error').length;
  }, [nodes]);

  return (
    <div className="app-container">
      <HistorySidebar
        history={questHistory}
        onSelectQuest={handleSelectQuest}
        activeQuestId={activeQuestId}
      />
      <main className="main-content">
        <div className="header-container">
          <h1>Curiosity Quest 🚀</h1>
          {totalQuests > 0 && (
            <div className="progress-counter">
              クリア済みクエスト: {completedCount} / {totalQuests}
            </div>
          )}
        </div>
        <div className="form-container">
          <form onSubmit={handleSubmit}>
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="AIに質問してみよう" />
            <button type="submit" disabled={isLoading}>{isLoading ? '考え中...' : 'クエストを生成'}</button>
          </form>
        </div>
        <div className="reactflow-container">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
          </ReactFlow>
        </div>
      </main>
      <QuestModal
        quest={activeQuest}
        onClose={() => setActiveQuest(null)}
        onQuizSubmit={handleQuizSubmit}
      />
    </div>
  );
}

export default App;