import { useState } from 'react'
import TaskCard from './TaskCard'
import './TaskReviewPanel.css'

interface Task {
  id: string
  title: string
  description: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  dueDate?: string
  isDuplicate: boolean
}

interface User {
  id: string
  displayName: string
}

interface TaskReviewPanelProps {
  tasks: Task[]
  users: User[]
  onCreateTasks: (taskIds: string[], assignments: { taskId: string; userId: string }[]) => void
  isLoading?: boolean
}

export default function TaskReviewPanel({
  tasks,
  users,
  onCreateTasks,
  isLoading = false,
}: TaskReviewPanelProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [assignments, setAssignments] = useState<{ [taskId: string]: string }>({})

  const nonDuplicateTasks = tasks.filter((t) => !t.isDuplicate)
  const duplicateTasks = tasks.filter((t) => t.isDuplicate)

  function toggleTaskSelection(taskId: string) {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  function updateAssignment(taskId: string, userId: string) {
    setAssignments((prev) => ({
      ...prev,
      [taskId]: userId,
    }))
  }

  function handleCreateTasks() {
    const taskIds = Array.from(selectedTasks)
    const taskAssignments = taskIds
      .map((taskId) => ({
        taskId,
        userId: assignments[taskId] || '',
      }))
      .filter((a) => a.userId) // Only include tasks with assignments

    if (taskAssignments.length === 0) {
      alert('Please assign at least one task to a user')
      return
    }

    onCreateTasks(taskIds, taskAssignments)
  }

  const selectAllNonDuplicates = () => {
    setSelectedTasks(new Set(nonDuplicateTasks.map((t) => t.id)))
  }

  const deselectAll = () => {
    setSelectedTasks(new Set())
  }

  return (
    <div className="task-review-panel">
      <div className="panel-header">
        <h2>Review Extracted Tasks</h2>
        <p>
          {nonDuplicateTasks.length} task{nonDuplicateTasks.length !== 1 ? 's' : ''} found
          {duplicateTasks.length > 0 && ` (${duplicateTasks.length} duplicates)`}
        </p>
      </div>

      <div className="panel-controls">
        <div className="controls-left">
          <button className="link-button" onClick={selectAllNonDuplicates}>
            Select All
          </button>
          <span className="divider">•</span>
          <button className="link-button" onClick={deselectAll}>
            Deselect All
          </button>
        </div>

        <button
          className="button button-primary"
          onClick={handleCreateTasks}
          disabled={selectedTasks.size === 0 || isLoading}
        >
          {isLoading ? 'Creating...' : `Create ${selectedTasks.size} Task${selectedTasks.size !== 1 ? 's' : ''}`}
        </button>
      </div>

      <div className="tasks-container">
        {nonDuplicateTasks.length === 0 && duplicateTasks.length === 0 ? (
          <p className="empty-state">No tasks to review</p>
        ) : (
          <>
            <div className="tasks-section">
              <h3>Tasks Ready for Creation</h3>
              {nonDuplicateTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  {...task}
                  onSelect={(checked) => {
                    if (checked) {
                      const newSelected = new Set(selectedTasks)
                      newSelected.add(task.id)
                      setSelectedTasks(newSelected)
                    } else {
                      const newSelected = new Set(selectedTasks)
                      newSelected.delete(task.id)
                      setSelectedTasks(newSelected)
                    }
                  }}
                  onAssign={(userId) => updateAssignment(task.id, userId)}
                  selectedUserId={assignments[task.id]}
                  users={users}
                />
              ))}
            </div>

            {duplicateTasks.length > 0 && (
              <div className="tasks-section duplicates-section">
                <h3>Duplicate Tasks (Not Selected)</h3>
                <p className="section-description">
                  These tasks appear to be duplicates and won't be created unless manually selected.
                </p>
                {duplicateTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    {...task}
                    onSelect={(checked) => {
                      if (checked) {
                        const newSelected = new Set(selectedTasks)
                        newSelected.add(task.id)
                        setSelectedTasks(newSelected)
                      } else {
                        const newSelected = new Set(selectedTasks)
                        newSelected.delete(task.id)
                        setSelectedTasks(newSelected)
                      }
                    }}
                    onAssign={(userId) => updateAssignment(task.id, userId)}
                    selectedUserId={assignments[task.id]}
                    users={users}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
