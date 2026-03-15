import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, HelpCircle, MessageCircle, Target, Download, Upload, Layout, Link as LinkIcon, Home, Undo2, Redo2, ChevronRight, ChevronLeft, ArrowUp, ArrowDown, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { AuthModal } from './components/AuthModal';

export type NodeType = 'default' | 'question' | 'answer' | 'intent';

export interface NodeData {
  id: string;
  parentId: string | null;
  content: string;
  type: NodeType;
  position: { x: number; y: number };
  intent?: string;
  expectedAnswer?: string;
}

export interface AdviceData {
    nodeId: string;
    content: string;
    resolved: boolean;
}

const NODE_WIDTH = 320;
const HORIZONTAL_SPACING = 420;
const VERTICAL_SPACING = 150;

const LogicNode = React.memo<{
  node: NodeData;
  isExpanded: boolean;
  onUpdate: (id: string, updates: Partial<NodeData>) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, type?: NodeType) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onToggleDetails?: (id: string) => void;
  onChangeType: (id: string, type: NodeType) => void;
  onStartRelink: (id: string, e: React.MouseEvent) => void;
  onInsertChild: (parentId: string) => void;
  onInsertParent: (childId: string) => void;
  onMoveSubtree: (id: string, direction: 'up' | 'down') => void;
  onTouch: (id: string) => void;
  isLastTouched: boolean;
  advice?: AdviceData;
  onResolveAdvice: (nodeId: string) => void;
}>(({ node, isExpanded, onUpdate, onDelete, onAddChild, onDragStart, onToggleDetails, onChangeType, onStartRelink, onInsertChild, onInsertParent, onMoveSubtree, onTouch, isLastTouched, advice, onResolveAdvice }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const getIcon = () => {
    switch (node.type) {
      case 'question': return <HelpCircle size={12} />;
      case 'answer': return <MessageCircle size={12} />;
      case 'intent': return <Target size={12} />;
      default: return null;
    }
  };

  const getTypeLabel = () => {
    switch (node.type) {
      case 'question': return '営業ヒアリング';
      case 'default': return '通常項目';
      default: return 'その他';
    }
  };

  return (
    <div 
      className={`node-container ${node.type}-node-border ${isLastTouched ? 'node-last-touched' : ''}`}
      style={{ left: node.position.x, top: node.position.y }}
      onMouseUp={() => window.dispatchEvent(new CustomEvent('nodeMouseUp', { detail: node.id }))}
      onMouseDown={(e) => { e.stopPropagation(); onTouch(node.id); }}
    >
      {advice && !advice.resolved && (
        <div className="advice-bubble">
           <div className="advice-content">{advice.content}</div>
           <button className="btn-resolve" onClick={(e) => { e.stopPropagation(); onResolveAdvice(node.id); }}>
               解決済み
           </button>
        </div>
      )}
      <div className="relink-handle" onMouseDown={(e) => onStartRelink(node.id, e)}>
        <LinkIcon size={10} />
      </div>
      <div className="drag-handle" onMouseDown={(e) => onDragStart(node.id, e)}>
        <div className="node-title" style={{ margin: 0 }}>
            <button 
                className="glass-panel" 
                title="項目タイプを変換"
                onClick={(e) => {
                    e.stopPropagation();
                    const newType = node.type === 'question' ? 'default' : 'question';
                    onChangeType(node.id, newType);
                }}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    background: 'rgba(255,255,255,0.08)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    cursor: 'pointer',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    color: node.type === 'question' ? 'var(--accent)' : 'var(--text-main)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                }}
            >
                {getIcon()}
                {getTypeLabel()}
            </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
             {node.type === 'question' && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onToggleDetails?.(node.id); }} 
                    className="glass-panel"
                    style={{ 
                        background: isExpanded ? 'var(--accent)' : 'var(--bg-panel)', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: '2px 6px',
                        fontSize: '10px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        color: isExpanded ? 'var(--primary)' : 'var(--text-muted)'
                    }}
                 >
                    {isExpanded ? '詳細を隠す' : '詳細を表示'}
                 </button>
             )}
             <button onClick={(e) => { e.stopPropagation(); onMoveSubtree(node.id, 'up'); }} title="上に移動" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <ArrowUp size={14} />
             </button>
             <button onClick={(e) => { e.stopPropagation(); onMoveSubtree(node.id, 'down'); }} title="下に移動" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <ArrowDown size={14} />
             </button>
             <button onClick={(e) => { e.stopPropagation(); onInsertParent(node.id); }} title="前に項目を挿入" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={14} />
             </button>
             <button onClick={(e) => { e.stopPropagation(); onInsertChild(node.id); }} title="後に項目を挿入" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={14} />
             </button>
             <button onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }} title="子項目を追加" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <Plus size={14} />
             </button>
             <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', display: 'flex', alignItems: 'center' }}>
                <Trash2 size={14} />
             </button>
        </div>
      </div>
      <div className="node-content-wrapper">
        <div 
            ref={contentRef}
            className="node-content"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onUpdate(node.id, { content: e.currentTarget.innerText })}
            onMouseDown={(e) => { e.stopPropagation(); onTouch(node.id); }} 
            onFocus={() => onTouch(node.id)}
            data-placeholder={node.type === 'question' ? '質問を入力...' : '項目を入力...'}
        >
            {node.content}
        </div>

        {node.type === 'question' && isExpanded && (
            <div className="node-details-container" onMouseDown={(e) => e.stopPropagation()}>
                <div className="detail-item">
                    <div className="detail-label"><Target size={10} /> 意図</div>
                    <div 
                        className="detail-content" 
                        contentEditable 
                        suppressContentEditableWarning
                        onBlur={(e) => onUpdate(node.id, { intent: e.currentTarget.innerText })}
                        onMouseDown={(e) => { e.stopPropagation(); onTouch(node.id); }}
                        onFocus={() => onTouch(node.id)}
                    >
                        {node.intent || '意図を入力...'}
                    </div>
                </div>
                <div className="detail-item">
                    <div className="detail-label"><MessageCircle size={10} /> 想定返答</div>
                    <div 
                        className="detail-content" 
                        contentEditable 
                        suppressContentEditableWarning
                        onBlur={(e) => onUpdate(node.id, { expectedAnswer: e.currentTarget.innerText })}
                        onMouseDown={(e) => { e.stopPropagation(); onTouch(node.id); }}
                        onFocus={() => onTouch(node.id)}
                    >
                        {node.expectedAnswer || '想定返答を入力...'}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
});

export default function App() {
  const [nodes, setNodes] = useState<NodeData[]>([
    { id: 'root', parentId: null, content: 'メインテーマ', type: 'default', position: { x: 100, y: 100 } }
  ]);
  const [history, setHistory] = useState<NodeData[][]>([]);
  const [redoStack, setRedoStack] = useState<NodeData[][]>([]);
  const [fileList, setFileList] = useState<string[]>([]);
  const [lastTouchedNodeId, setLastTouchedNodeId] = useState<string>('root');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [adviceList, setAdviceList] = useState<AdviceData[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 1500); // 1.5s display for readability, then fades
  }, []);
  
  const [draggingNode, setDraggingNode] = useState<{ id: string, startPos: { x: number, y: number }, offset: { x: number, y: number } } | null>(null);
  const [relinkingNodeId, setRelinkingNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [viewState, setViewState] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const adviceInputRef = useRef<HTMLInputElement>(null);
  const [currentFilename, setCurrentFilename] = useState<string>('logic_tree.csv');

  const pushToHistory = useCallback((currentNodes: NodeData[]) => {
    setHistory(prev => [...prev.slice(-49), currentNodes]); // Keep last 50 states
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [...prev, nodes]);
    setNodes(previous);
    setHistory(prev => prev.slice(0, -1));
  }, [history, nodes]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchFileList = useCallback(async () => {
    if (!user) {
      setFileList([]); // Guests don't see server files
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from('Flex-Tree')
        .list(user.id, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (error) throw error;
      
      const files = data.map(f => f.name);
      setFileList(files);
      if ((!currentFilename || currentFilename === 'logic_tree.csv') && files.length > 0) {
        setCurrentFilename(files[0]);
      }
    } catch (err) {
      console.error('Failed to fetch file list', err);
    }
  }, [user, currentFilename]);

  useEffect(() => {
    fetchFileList();
  }, [fetchFileList]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, nodes]);
    setNodes(next);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack, nodes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                undo();
            } else if (e.key === 'y') {
                e.preventDefault();
                redo();
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // --- Persistence ---
  useEffect(() => {
    const saved = localStorage.getItem('flex-tree-nodes');
    if (saved) {
        try {
            setNodes(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to load nodes from localStorage", e);
        }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('flex-tree-nodes', JSON.stringify(nodes));
  }, [nodes]);

  useEffect(() => {
    // 5-minute Auto-save logic
    const interval = setInterval(() => {
      if (user) {
        saveToProject(currentFilename, nodes);
        setLastAutoSave(new Date());
        console.log('Auto-saved to server at', new Date().toLocaleTimeString());
      } else {
        localStorage.setItem('flex-tree-nodes', JSON.stringify(nodes));
        setLastAutoSave(new Date());
        console.log('Auto-saved to local at', new Date().toLocaleTimeString());
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, currentFilename, nodes]);

  const updateNode = useCallback((id: string, updates: Partial<NodeData>) => {
    setNodes(prev => {
        const next = prev.map(n => n.id === id ? { ...n, ...updates } : n);
        // Only push to history if content or something substantive changed (not every drag frame)
        // Wait, updateNode is called for every frame during drag? 
        // Let's check how it's used.
        return next;
    });
  }, []);

  const updateNodeSubstantive = useCallback((id: string, updates: Partial<NodeData>) => {
    pushToHistory(nodes);
    updateNode(id, updates);
  }, [pushToHistory, nodes, updateNode]);

  const toggleDetails = useCallback((id: string) => {
    setExpandedNodeIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  }, []);

  const toggleAllDetails = useCallback((visible: boolean) => {
    if (visible) {
        setExpandedNodeIds(new Set(nodes.filter(n => n.type === 'question').map(n => n.id)));
    } else {
        setExpandedNodeIds(new Set());
    }
  }, [nodes]);

  const changeNodeType = useCallback((id: string, type: NodeType) => {
    setNodes(prev => prev.map(n => n.id === id ? { 
        ...n, 
        type, 
        intent: type === 'question' ? (n.intent || '意図を入力...') : n.intent,
        expectedAnswer: type === 'question' ? (n.expectedAnswer || '想定返答を入力...') : n.expectedAnswer
    } : n));
  }, []);

  const toggleAdviceResolved = useCallback((nodeId: string) => {
    setAdviceList(prev => prev.map(adv => 
      adv.nodeId === nodeId ? { ...adv, resolved: !adv.resolved } : adv
    ));
  }, []);

  const isNodeVisible = useCallback((nodeId: string): boolean => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return false;
    if (!node.parentId) return true;
    return isNodeVisible(node.parentId);
  }, [nodes]);

  const deleteNode = useCallback((id: string) => {
    if (id === 'root') return;
    pushToHistory(nodes);
    
    setNodes(prev => {
        const nodeToDelete = prev.find(n => n.id === id);
        if (!nodeToDelete) return prev;

        const deletedParentId = nodeToDelete.parentId;

        // Update children to point to the grandparent
        const updated = prev.map(n => 
            n.parentId === id ? { ...n, parentId: deletedParentId } : n
        );

        // Remove the target node
        return updated.filter(n => n.id !== id);
    });
  }, [nodes, pushToHistory]);

  const addChild = useCallback((parentId?: string, forceType?: NodeType) => {
    const actualParentId = parentId || lastTouchedNodeId;
    const parentNode = nodes.find(n => n.id === actualParentId);
    if (!parentNode) return;

    pushToHistory(nodes);
    const childCount = nodes.filter(n => n.parentId === actualParentId).length;
    const type = forceType || parentNode.type; // Inherit parent type by default

    const newNode: NodeData = {
      id: Math.random().toString(36).substr(2, 9),
      parentId: actualParentId as string | null,
      content: '',
      type,
      position: { 
        x: parentNode.position.x + HORIZONTAL_SPACING, 
        y: parentNode.position.y + (childCount * VERTICAL_SPACING)
      },
      intent: type === 'question' ? '項目の意図' : undefined,
      expectedAnswer: type === 'question' ? '想定される答え' : undefined
    };
    setNodes(prev => [...prev, newNode]);
  }, [nodes, pushToHistory, lastTouchedNodeId]);

  const addSalesHearingSet = useCallback((parentId?: string) => {
    const actualParentId = parentId || lastTouchedNodeId;
    const parentNode = nodes.find(n => n.id === actualParentId);
    if (!parentNode) return;
    pushToHistory(nodes);
    const childCount = nodes.filter(n => n.parentId === actualParentId).length;
    const qId = Math.random().toString(36).substr(2, 9);
    const qNode: NodeData = { 
        id: qId, parentId: actualParentId as string | null, content: '', type: 'question', 
        position: { x: parentNode.position.x + HORIZONTAL_SPACING, y: parentNode.position.y + (childCount * VERTICAL_SPACING) }, 
        intent: '質問の意図', expectedAnswer: '想定返答'
    };
    setNodes(prev => [...prev, qNode]);
  }, [nodes, pushToHistory, lastTouchedNodeId]);

  const insertBetween = useCallback((parentId: string) => {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;

    pushToHistory(nodes);
    const newId = Math.random().toString(36).substr(2, 9);
    
    const newNode: NodeData = {
        id: newId,
        parentId,
        content: '',
        type: 'default',
        position: { x: parentNode.position.x + HORIZONTAL_SPACING / 2, y: parentNode.position.y }
    };

    setNodes(prev => {
        const updated = prev.map(n => n.parentId === parentId ? { ...n, parentId: newId } : n);
        return [...updated, newNode];
    });
  }, [nodes, pushToHistory]);

  const insertParent = useCallback((childId: string) => {
    const childNode = nodes.find(n => n.id === childId);
    if (!childNode) return;

    pushToHistory(nodes);
    const oldParentId = childNode.parentId as string | null;
    const newId = Math.random().toString(36).substr(2, 9);

    const newNode: NodeData = {
        id: newId,
        parentId: oldParentId,
        content: '',
        type: 'default',
        position: { 
            x: childNode.position.x - HORIZONTAL_SPACING / 2, 
            y: childNode.position.y 
        }
    };

    setNodes(prev => prev.map(n => n.id === childId ? { ...n, parentId: newId } : n).concat(newNode));
  }, [nodes, pushToHistory]);

  const moveSubtree = useCallback((id: string, direction: 'up' | 'down') => {
    const node = nodes.find(n => n.id === id);
    if (!node || !node.parentId) return;

    pushToHistory(nodes);
    
    // Get all siblings in their current vertical order
    const siblings = nodes
        .filter(n => n.parentId === node.parentId)
        .sort((a, b) => a.position.y - b.position.y);
    
    const index = siblings.findIndex(s => s.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const targetNode = siblings[targetIndex];
    
    // Find all descendants for both nodes to move them together
    const getDescendants = (rootId: string, allNodes: NodeData[]): string[] => {
        let ids: string[] = [rootId];
        const children = allNodes.filter(n => n.parentId === rootId);
        children.forEach(c => {
            ids = ids.concat(getDescendants(c.id, allNodes));
        });
        return ids;
    };

    const nodeSubtreeIds = new Set(getDescendants(id, nodes));
    const targetSubtreeIds = new Set(getDescendants(targetNode.id, nodes));

    // Calculate the vertical shift
    // We want to swap the vertical positions of the two subtrees
    // Simple way: swap the root positions and shift all descendants by the same amount
    const shift = targetNode.position.y - node.position.y;

    setNodes(prev => prev.map(n => {
        if (nodeSubtreeIds.has(n.id)) {
            return { ...n, position: { ...n.position, y: n.position.y + shift } };
        }
        if (targetSubtreeIds.has(n.id)) {
            return { ...n, position: { ...n.position, y: n.position.y - shift } };
        }
        return n;
    }));
  }, [nodes, pushToHistory]);

  const insertBetweenOnEdge = useCallback((parentId: string, childId: string) => {
    const parentNode = nodes.find(n => n.id === parentId);
    const childNode = nodes.find(n => n.id === childId);
    if (!parentNode || !childNode) return;

    pushToHistory(nodes);
    const newId = Math.random().toString(36).substr(2, 9);
    const newNode: NodeData = {
        id: newId,
        parentId,
        content: '',
        type: 'default',
        position: { 
            x: (parentNode.position.x + childNode.position.x) / 2, 
            y: (parentNode.position.y + childNode.position.y) / 2 
        }
    };

    setNodes(prev => prev.map(n => n.id === childId ? { ...n, parentId: newId } : n).concat(newNode));
  }, [nodes, pushToHistory]);

  const relinkNode = useCallback((childId: string, newParentId: string) => {
    if (childId === newParentId) return;
    // Prevent circular reference
    const checkCircular = (pid: string): boolean => {
        if (pid === childId) return true;
        const parent = nodes.find(n => n.id === pid);
        return parent && parent.parentId ? checkCircular(parent.parentId) : false;
    };
    if (checkCircular(newParentId)) return;

    pushToHistory(nodes);
    setNodes(prev => prev.map(n => n.id === childId ? { ...n, parentId: newParentId } : n));
  }, [nodes, pushToHistory]);

  // --- CSV Persistence ---
  const generateCSV = (nodesToSave: NodeData[]): string => {
    const headers = ['id', 'parentId', 'type', 'content', 'x', 'y', 'intent', 'expectedAnswer'];
    const rows = nodesToSave.map(n => [
        n.id, n.parentId || '', n.type, `"${n.content.replace(/"/g, '""')}"`, 
        n.position.x, n.position.y,
        `"${(n.intent || '').replace(/"/g, '""')}"`, 
        `"${(n.expectedAnswer || '').replace(/"/g, '""')}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  const saveToProject = async (filename: string, nodesToSave: NodeData[]) => {
    try {
        const csvContent = generateCSV(nodesToSave);
        
        if (user) {
          // Save to Supabase Storage
          const { error } = await supabase.storage
            .from('Flex-Tree')
            .upload(`${user.id}/${filename}`, csvContent, {
              upsert: true,
              contentType: 'text/csv'
            });
          if (error) throw error;
          showToast('クラウドに保存しました');
        } else {
          // Fallback to local API (for dev/local setup) or alert as limited
          const response = await fetch('/api/save-csv', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename, content: csvContent })
          });
          if (!response.ok) throw new Error('Failed to save to local project');
          showToast('プロジェクト内に保存しました');
        }
        fetchFileList();
    } catch (e: any) {
        console.error("Save failed", e);
        showToast(`保存に失敗しました: ${e.message}`, 'error');
    }
  };

  const downloadCSV = () => {
    const headers = ['id', 'parentId', 'type', 'content', 'x', 'y', 'intent', 'expectedAnswer'];
    const rows = nodes.map(n => [
      n.id, n.parentId || '', n.type, `"${n.content.replace(/"/g, '""')}"`, 
      n.position.x, n.position.y,
      `"${(n.intent || '').replace(/"/g, '""')}"`, 
      `"${(n.expectedAnswer || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", currentFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVContent = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];
    
    return lines.slice(1).map(line => {
        const res = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuote && line[i+1] === '"') {
                    cur += '"'; i++;
                } else {
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                res.push(cur);
                cur = '';
            } else {
                cur += char;
            }
        }
        res.push(cur);
        const parts = res;

        return {
            id: (parts[0] || '').trim(),
            parentId: (parts[1] || '').trim() || null,
            type: (parts[2] || 'default').trim() as NodeType,
            content: parts[3] || '',
            position: { x: parseInt(parts[4] || '100'), y: parseInt(parts[5] || '100') },
            intent: parts[6] || '',
            expectedAnswer: parts[7] || ''
        };
    });
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        const importedNodes = parseCSVContent(text);
        if (importedNodes.length > 0) {
            setNodes(importedNodes);
            setCurrentFilename(file.name);
            saveToProject(file.name, importedNodes); // Save uploaded file to project immediately
        }
    };
    reader.readAsText(file);
  };

  const importAdviceCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length < 2) return;
        
        const importedAdvice: AdviceData[] = lines.slice(1).map(line => {
            // Very simple CSV parse for ID and Content, assuming no complex quotes in ID
            const firstComma = line.indexOf(',');
            if (firstComma === -1) return null;
            const nodeId = line.substring(0, firstComma).trim();
            let content = line.substring(firstComma + 1).trim();
            // Ensure we remove BOTH surrounding quotes if they exist
            if (content.startsWith('"') && content.endsWith('"')) {
                content = content.substring(1, content.length - 1);
            }
            // Replace escaped quotes
            content = content.replace(/""/g, '"');
            
            return { nodeId, content, resolved: false };
        }).filter(Boolean) as AdviceData[];

        setAdviceList(importedAdvice);
        showToast('アドバイスを読み込みました');
    };
    reader.readAsText(file);
    // Reset file input so the same file can be loaded again if needed
    if (adviceInputRef.current) adviceInputRef.current.value = '';
  };

  const loadFromLibrary = async (filename: string) => {
    if (!filename) return;
    try {
        let text = '';
        if (user) {
          const { data, error } = await supabase.storage
            .from('Flex-Tree')
            .download(`${user.id}/${filename}`);
          if (error) throw error;
          text = await data.text();
        } else {
          const response = await fetch(`/data/${filename}`);
          if (!response.ok) throw new Error("File not found");
          text = await response.text();
        }
        
        const importedNodes = parseCSVContent(text);
        if (importedNodes.length > 0) {
            setExpandedNodeIds(new Set()); // Reset UI state
            const alignedNodes = autoAlign(importedNodes);
            setNodes(alignedNodes);
            setCurrentFilename(filename);
            resetView(alignedNodes);
        }
    } catch (e: any) {
        console.error("Load failed", e);
        showToast(`読み込みに失敗しました: ${e.message}`, 'error');
    }
  };

  const resetView = (nodesToUse: NodeData[] = nodes) => {
    const rootNode = nodesToUse.find(n => n.id === 'root' || !n.parentId);
    if (rootNode) {
        // Center the root node in the view
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        setViewState({
            x: centerX - rootNode.position.x,
            y: centerY - rootNode.position.y,
            zoom: 1
        });
    } else {
        setViewState({ x: 0, y: 0, zoom: 1 });
    }
  };

  // --- Auto Alignment ---
  const autoAlign = (nodesToAlign: NodeData[] = nodes) => {
    const newNodes = JSON.parse(JSON.stringify(nodesToAlign));
    const roots = newNodes.filter((n: NodeData) => !n.parentId);
    
    // Constants for layout calculation
    const BASE_HEIGHT = 120; // Increased base height
    const DETAILS_HEIGHT = 180; // Increased details height estimation
    const GAP = 40; // Increased vertical gap

    const getNodeHeight = (node: NodeData) => {
        // Estimate height based on content length (approx 40 chars per line for 320px)
        const contentLines = Math.ceil((node.content.length || 1) / 35);
        let h = Math.max(BASE_HEIGHT, contentLines * 24 + 60);
        
        if (node.type === 'question' && expandedNodeIds.has(node.id)) {
            const intentLines = Math.ceil((node.intent?.length || 1) / 40);
            const answerLines = Math.ceil((node.expectedAnswer?.length || 1) / 40);
            h += Math.max(DETAILS_HEIGHT, (intentLines + answerLines) * 20 + 80);
        }
        return h;
    };

    // First Pass: Calculate vertical space required for each subtree
    const subtreeHeightMap = new Map<string, number>();
    const getSubtreeHeight = (nodeId: string): number => {
        const node = newNodes.find((n: NodeData) => n.id === nodeId);
        if (!node) return 0;

        const children = newNodes.filter((n: NodeData) => n.parentId === nodeId);
        if (children.length === 0) {
            const h = getNodeHeight(node) + GAP;
            subtreeHeightMap.set(nodeId, h);
            return h;
        }

        const totalChildrenHeight = children.reduce((sum: number, child: NodeData) => sum + getSubtreeHeight(child.id), 0);
        const nodeHeight = getNodeHeight(node) + GAP;
        const totalHeight = Math.max(nodeHeight, totalChildrenHeight);
        
        subtreeHeightMap.set(nodeId, totalHeight);
        return totalHeight;
    };

    // Second Pass: Position nodes based on subtree heights
    const positionNode = (nodeId: string, x: number, y: number, availableHeight: number) => {
        const node = newNodes.find((n: NodeData) => n.id === nodeId);
        if (!node) return;

        const nodeHeight = getNodeHeight(node);
        // Center node in the allocated vertical space for its subtree
        const centerY = y + availableHeight / 2 - nodeHeight / 2;
        node.position = { x, y: centerY };

        const children = newNodes
            .filter((n: NodeData) => n.parentId === nodeId)
            .sort((a: NodeData, b: NodeData) => a.position.y - b.position.y);
        let childY = y;
        children.forEach((child: NodeData) => {
            const childSubtreeHeight = subtreeHeightMap.get(child.id) || 0;
            positionNode(child.id, x + HORIZONTAL_SPACING, childY, childSubtreeHeight);
            childY += childSubtreeHeight;
        });
    };

    let currentTreeY = 100;
    roots.forEach((root: NodeData) => {
        const h = getSubtreeHeight(root.id);
        positionNode(root.id, 100, currentTreeY, h);
        currentTreeY += h + GAP * 1.5;
    });

    pushToHistory(nodes);
    setNodes(newNodes);
    return newNodes;
  };

  // --- Interaction ---
  const onDragStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    setDraggingNode({
      id,
      startPos: { x: node.position.x, y: node.position.y },
      offset: { 
        x: (e.clientX / viewState.zoom) - node.position.x, 
        y: (e.clientY / viewState.zoom) - node.position.y 
      }
    });
  };

  const onStartRelink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRelinkingNodeId(id);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.target === canvasRef.current) {
        setIsPanning(true);
        setDraggingNode(null);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      if (draggingNode) {
        updateNode(draggingNode.id, {
          position: {
            x: (e.clientX / viewState.zoom) - draggingNode.offset.x,
            y: (e.clientY / viewState.zoom) - draggingNode.offset.y
          }
        });
      } else if (isPanning) {
          setViewState(prev => ({
              ...prev,
              x: prev.x + e.movementX,
              y: prev.y + e.movementY
          }));
      }
    };

    const handleNodeMouseUp = (e: any) => {
        if (relinkingNodeId) {
            relinkNode(relinkingNodeId, e.detail);
        }
    };

    const handleMouseUpGlobal = () => {
        if (draggingNode) {
            // Check if position actually changed significantly before pushing to history
            const node = nodes.find(n => n.id === draggingNode.id);
            if (node && (Math.abs(node.position.x - draggingNode.startPos.x) > 1 || Math.abs(node.position.y - draggingNode.startPos.y) > 1)) {
                pushToHistory(nodes.map(n => n.id === draggingNode.id ? { ...n, position: draggingNode.startPos } : n));
            }
        }
        setDraggingNode(null);
        setRelinkingNodeId(null);
        setIsPanning(false);
    };

    const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            setViewState(prev => ({
                ...prev,
                zoom: Math.min(Math.max(prev.zoom + delta, 0.2), 3)
            }));
        } else {
            e.preventDefault();
            setViewState(prev => ({
                ...prev,
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUpGlobal);
    window.addEventListener('nodeMouseUp', handleNodeMouseUp as EventListener);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
      window.removeEventListener('nodeMouseUp', handleNodeMouseUp as EventListener);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [draggingNode, relinkingNodeId, isPanning, viewState.zoom, updateNode, relinkNode, nodes, pushToHistory]);

  const visibleNodes = nodes.filter(n => isNodeVisible(n.id));

  return (
    <div 
        className="canvas-wrapper"
        style={{ 
            backgroundPosition: `${viewState.x}px ${viewState.y}px`,
            backgroundSize: `${40 * viewState.zoom}px ${40 * viewState.zoom}px`
        }}
    >
      <div className="toolbar">
        {/* Group 1: Identity & Navigation */}
        <div className="toolbar-group">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,31,63,0.05)', padding: '4px 12px', borderRadius: '20px' }}>
               <UserIcon size={14} color="var(--accent)" />
               <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>{user.email}</span>
               <button className="btn-icon" onClick={() => supabase.auth.signOut()} title="ログアウト">
                 <LogOut size={16} />
               </button>
            </div>
          ) : (
            <button className="btn-premium accent" onClick={() => setIsAuthModalOpen(true)}>
              <LogIn size={18} /> ログイン
            </button>
          )}
          <button className="btn-premium secondary" onClick={() => resetView()}>
            <Home size={18} /> TOP
          </button>
        </div>

        <div className="toolbar-separator"></div>

        {/* Group 2: Edit (History) */}
        <div className="toolbar-group">
          <button className="btn-premium secondary" onClick={undo} disabled={history.length === 0}>
            <Undo2 size={16} /> Undo
          </button>
          <button className="btn-premium secondary" onClick={redo} disabled={redoStack.length === 0}>
            <Redo2 size={16} /> Redo
          </button>
        </div>

        <div className="toolbar-separator"></div>

        {/* Group 3: Insert */}
        <div className="toolbar-group">
          <button className="btn-premium" onClick={() => addChild('root', 'default')}>
            <Plus size={18} /> 通常
          </button>
          <button className="btn-premium accent" onClick={() => addSalesHearingSet('root')}>
            <Target size={18} /> 営業ヒアリング
          </button>
        </div>

        <div className="toolbar-separator"></div>

        {/* Group 4: View */}
        <div className="toolbar-group">
          <button className="btn-premium success" onClick={() => autoAlign()}>
              <Layout size={16} /> 整列
          </button>
          <button className="btn-premium secondary" style={{ padding: '8px 10px' }} onClick={() => toggleAllDetails(true)} title="一括表示">表示</button>
          <button className="btn-premium secondary" style={{ padding: '8px 10px' }} onClick={() => toggleAllDetails(false)} title="一括非表示">非表示</button>
          
          <div className="zoom-controls">
              <button className="btn-icon" onClick={() => setViewState(v => ({ ...v, zoom: Math.max(v.zoom - 0.1, 0.2) }))}>-</button>
              <div className="zoom-value">{Math.round(viewState.zoom * 100)}%</div>
              <button className="btn-icon" onClick={() => setViewState(v => ({ ...v, zoom: Math.min(v.zoom + 0.1, 3) }))}>+</button>
          </div>
        </div>

        <div className="toolbar-separator"></div>

        {/* Group 5: File Operations */}
        <div className="toolbar-group">
          <select 
              value={currentFilename} 
              onChange={(e) => setCurrentFilename(e.target.value)}
              className="select-premium"
              style={{ width: '130px' }}
          >
              <option value="">ファイル...</option>
              {fileList.map(file => (
                  <option key={file} value={file}>{file}</option>
              ))}
          </select>
          <button className="btn-premium info" style={{ padding: '8px' }} onClick={() => loadFromLibrary(currentFilename)} title="読込">
             <ChevronRight size={18} />
          </button>
          <button className="btn-premium info" onClick={() => saveToProject(currentFilename, nodes)}>
              <Download size={14} /> 保存
          </button>
          <button className="btn-premium success" style={{ padding: '8px' }} onClick={downloadCSV} title="DL">
              <Download size={18} />
          </button>
          <button className="btn-premium secondary" style={{ padding: '8px' }} onClick={() => fileInputRef.current?.click()} title="外部読込">
              <Upload size={18} />
          </button>
          <button className="btn-premium info" style={{ padding: '8px 12px' }} onClick={() => adviceInputRef.current?.click()} title="アドバイス読込">
              アドバイス
          </button>
        </div>
        <input type="file" ref={fileInputRef} className="file-input-hidden" accept=".csv" onChange={importCSV} />
        <input type="file" ref={adviceInputRef} className="file-input-hidden" accept=".csv" onChange={importAdviceCSV} />
      </div>


      <div 
        ref={canvasRef}
        className="canvas-content"
        onMouseDown={onCanvasMouseDown}
        style={{ 
            transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.zoom})`,
            transformOrigin: '0 0'
        }}
      >
        <svg className="connection-svg">
          {relinkingNodeId && (
              <line 
                  x1={(mousePos.x - viewState.x) / viewState.zoom} 
                  y1={(mousePos.y - viewState.y) / viewState.zoom} 
                  x2={nodes.find(n => n.id === relinkingNodeId)?.position.x} 
                  y2={(nodes.find(n => n.id === relinkingNodeId)?.position.y || 0) + 40}
                  className="relink-ghost-line"
              />
          )}
          {visibleNodes.map(node => {
            if (!node.parentId) return null;
            const parent = nodes.find(n => n.id === node.parentId);
            if (!parent || !isNodeVisible(parent.id)) return null;

            const startX = parent.position.x + NODE_WIDTH;
            const startY = parent.position.y + 40; 
            const endX = node.position.x;
            const endY = node.position.y + 40;
            const pathD = `M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`;
            
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            return (
              <g key={`${parent.id}-${node.id}`}>
                <path
                  className="connection-hit-area"
                  d={pathD}
                  onClick={() => insertBetweenOnEdge(parent.id, node.id)}
                />
                <path
                  className="connection-line"
                  d={pathD}
                  vectorEffect="non-scaling-stroke"
                />
                <g className="connection-plus-group" onClick={(e) => { e.stopPropagation(); insertBetweenOnEdge(parent.id, node.id); }}>
                  <rect 
                    x={midX - 20} y={midY - 20} width="40" height="40" 
                    fill="transparent" 
                    className="connection-plus-hit-area"
                  />
                  <circle className="connection-plus-circle" cx={midX} cy={midY} r="12" />
                  <path className="connection-plus-icon" d={`M ${midX-6} ${midY} L ${midX+6} ${midY} M ${midX} ${midY-6} L ${midX} ${midY+6}`} stroke="white" strokeWidth="2" />
                </g>
              </g>
            );
          })}
        </svg>
        {visibleNodes.map(node => (
          <LogicNode 
            key={node.id} 
            node={node} 
            advice={adviceList.find(a => a.nodeId === node.id)}
            isExpanded={expandedNodeIds.has(node.id)}
            isLastTouched={node.id === lastTouchedNodeId}
            onTouch={setLastTouchedNodeId}
            onUpdate={updateNodeSubstantive} 
            onDelete={deleteNode}
            onAddChild={addChild}
            onDragStart={onDragStart}
            onToggleDetails={toggleDetails}
            onChangeType={changeNodeType}
            onStartRelink={onStartRelink}
            onInsertChild={insertBetween}
            onInsertParent={insertParent}
            onMoveSubtree={moveSubtree}
            onResolveAdvice={toggleAdviceResolved}
          />
        ))}
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {lastAutoSave && (
        <div style={{ position: 'fixed', bottom: '10px', right: '10px', fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: '4px' }}>
          自動保存: {lastAutoSave.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

// End of App component
