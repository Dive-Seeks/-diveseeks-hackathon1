'use client';
import '@xyflow/react/dist/style.css';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Node,
  Edge,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import { useMemo, useEffect, useCallback } from 'react';
import { GoalNode, GoalNodeData } from './canvas/GoalNode';
import { TaskNode, TaskNodeData } from './canvas/TaskNode';
import { WorkflowSuggestionInput } from './WorkflowSuggestionInput';
import { useWorkflowGraph } from '@/hooks/useWorkflowGraph';
import { GoalWithTasks } from '@/types/project-feed';

const NODE_TYPES = { goalNode: GoalNode, taskNode: TaskNode };

const GOAL_X_GAP = 380;
const TASK_Y_START = 200;
const TASK_Y_GAP = 180;

function buildGraph(
  goals: GoalWithTasks[],
  handlers: {
    onAddTask: (goalId: string, title: string, description: string, specialist: string) => void;
    onMarkDone: (taskId: string) => void;
    onMarkBlocked: (taskId: string) => void;
    onDelete: (taskId: string) => void;
  },
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  goals.forEach((goal, gi) => {
    const gx = gi * GOAL_X_GAP;

    nodes.push({
      id: `goal_${goal.goalId}`,
      type: 'goalNode',
      position: { x: gx, y: 0 },
      data: {
        goalId: goal.goalId,
        goalTitle: goal.goalTitle,
        goalStatus: goal.goalStatus,
        taskCount: goal.tasks.length,
        onAddTask: handlers.onAddTask,
      } satisfies GoalNodeData,
    });

    goal.tasks.forEach((task, ti) => {
      const nodeId = `task_${task.id}`;
      nodes.push({
        id: nodeId,
        type: 'taskNode',
        position: { x: gx, y: TASK_Y_START + ti * TASK_Y_GAP },
        data: {
          taskId: task.id,
          title: task.title,
          description: task.description,
          specialist: task.specialist,
          status: task.status,
          source: task.source,
          onMarkDone: handlers.onMarkDone,
          onMarkBlocked: handlers.onMarkBlocked,
          onDelete: handlers.onDelete,
        } satisfies TaskNodeData,
      });

      if (ti === 0) {
        // Goal → first task
        edges.push({
          id: `e_goal_${goal.goalId}_${task.id}`,
          source: `goal_${goal.goalId}`,
          target: nodeId,
          style: { stroke: 'hsl(var(--border))', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--border))', width: 12, height: 12 },
        });
      } else {
        // Previous task → this task (sequential chain)
        const prevTaskId = `task_${goal.tasks[ti - 1].id}`;
        edges.push({
          id: `e_seq_${goal.tasks[ti - 1].id}_${task.id}`,
          source: prevTaskId,
          target: nodeId,
          style: { stroke: 'hsl(var(--border))', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--border))', width: 12, height: 12 },
        });
      }
    });
  });

  return { nodes, edges };
}

interface Props {
  projectId: string;
}

export function WorkflowCanvas({ projectId }: Props) {
  const { goals, loading, deleteTask, updateTaskStatus, addTask } =
    useWorkflowGraph(projectId);

  const handlers = useMemo(
    () => ({
      onAddTask: addTask,
      onMarkDone: (id: string) => updateTaskStatus(id, 'done'),
      onMarkBlocked: (id: string) => updateTaskStatus(id, 'blocked'),
      onDelete: deleteTask,
    }),
    [addTask, updateTaskStatus, deleteTask],
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(goals, handlers),
    [goals, handlers],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync when goals data changes (WS update or refetch)
  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(goals, handlers);
    setNodes(n);
    setEdges(e);
  }, [goals, handlers, setNodes, setEdges]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        <span className="animate-pulse">Loading task graph…</span>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center px-6">
        <p className="text-muted-foreground text-sm max-w-xs">
          Vision setup required before tasks can be created. Complete vision setup to see the task canvas.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>
      <WorkflowSuggestionInput projectId={projectId} />
    </div>
  );
}
