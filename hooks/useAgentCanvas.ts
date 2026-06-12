'use client';
import { useState, useCallback, useEffect } from 'react';
import { Edge, useNodesState, useEdgesState } from '@xyflow/react';
import { AppNode, AgentMessage, AgentNodeData } from '../lib/agent-canvas.types';
import { getIdentity, SPECIALIST_IDENTITIES } from '../lib/specialist-identities';
import api from '../lib/api';
import { socket } from '../lib/socket';

// CEO sits at the top of every team's canvas
const CEO_NODE: AppNode = {
  id: 'abigail-ceo',
  type: 'agent',
  position: { x: 400, y: 50 },
  data: {
    id: 'abigail-ceo',
    identity: getIdentity('abigail-ceo'),
    status: 'idle',
    isExpanded: false,
  },
};

function buildTeamNodes(team: 'coding' | 'general' | 'research'): { nodes: AppNode[]; edges: Edge[] } {
  const specialists = Object.entries(SPECIALIST_IDENTITIES)
    .filter(([, identity]) => identity.team === team)
    .map(([id]) => id);

  const nodes: AppNode[] = [CEO_NODE];
  const edges: Edge[] = [];

  const cols = Math.min(specialists.length, 4);
  const startX = 400 - ((cols - 1) * 200) / 2;

  specialists.forEach((id, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    nodes.push({
      id,
      type: 'agent',
      position: { x: startX + col * 200, y: 250 + row * 200 },
      data: {
        id,
        identity: getIdentity(id),
        status: 'idle',
        isExpanded: false,
      },
    });
    edges.push({
      id: `e-ceo-${id}`,
      source: 'abigail-ceo',
      target: id,
      animated: true,
    });
  });

  return { nodes, edges };
}

export function useAgentCanvas(projectId: string, team: 'coding' | 'general' | 'research' = 'coding') {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Fetch historical agent chat messages from backend
  useEffect(() => {
    if (!projectId) return;
    api
      .get<{ data: AgentMessage[] }>(`/project-feed/${projectId}/chat`)
      .then((res) => {
        const payload = (res.data as any)?.data ?? [];
        if (Array.isArray(payload) && payload.length > 0) {
          setMessages(payload);
        }
      })
      .catch(() => undefined); // non-fatal
  }, [projectId]);

  // Hook to append incoming messages and animate edges
  const addMessage = useCallback((msg: AgentMessage) => {
    setMessages((prev) => [...prev, msg]);
    setActiveThreadId(msg.threadId);

    // Update node status
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === msg.fromAgent) {
          return {
            ...n,
            data: {
              ...n.data,
              status: (msg.interactionType === 'job_completed' ? 'done' : 'running') as AgentNodeData['status'],
              currentTask: msg.content,
            },
          };
        }
        return n;
      })
    );

    // Pulse edge if interacting
    if (msg.toAgent) {
      setEdges((eds) =>
        eds.map((e) => {
          if (
            (e.source === msg.fromAgent && e.target === msg.toAgent) ||
            (e.source === msg.toAgent && e.target === msg.fromAgent)
          ) {
            return { ...e, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } };
          }
          return { ...e, animated: false, style: {} };
        })
      );

      // Reset edge animation after 2 seconds
      setTimeout(() => {
        setEdges((eds) =>
          eds.map((e) => ({ ...e, animated: false, style: {} }))
        );
      }, 2000);
    }
  }, [setNodes, setEdges]);

  // Subscribe to live agent messages via WebSocket
  useEffect(() => {
    if (!projectId) return;
    socket.emit('join_project_feed', { projectId });
    const handler = (payload: any) => {
      if (payload?.type === 'agent_message' && payload.projectId === projectId) {
        const { type: _, ...msg } = payload;
        addMessage(msg as AgentMessage);
      }
    };
    socket.on('project_feed_updated', handler);
    return () => {
      socket.off('project_feed_updated', handler);
      socket.emit('leave_project_feed', { projectId });
    };
  }, [projectId, addMessage]);

  // Build org-chart nodes for the current team whenever team changes
  useEffect(() => {
    const { nodes: defaultNodes, edges: defaultEdges } = buildTeamNodes(team);
    setNodes(defaultNodes);
    setEdges(defaultEdges);
  }, [team, setNodes, setEdges]);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    messages,
    activeThreadId,
    addMessage,
  };
}
