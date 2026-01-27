import './TaskCard.css'

interface TaskCardProps {
  id: string
  title: string
  description: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  dueDate?: string
  isDuplicate: boolean
  onSelect: (checked: boolean) => void
  onAssign: (userId: string) => void
  selectedUserId?: string
  users: Array<{ id: string; displayName: string }>
}

export default function TaskCard({
  id,
  title,
  description,
  priority,
  dueDate,
  isDuplicate,
  onSelect,
  onAssign,
  selectedUserId,
  users,
}: TaskCardProps) {
  const priorityColors: Record<string, string> = {
    urgent: '#e74c3c',
    high: '#f39c12',
    normal: '#3498db',
    low: '#2ecc71',
  }

  const priorityLabels: Record<string, string> = {
    urgent: 'Urgent',
    high: 'High',
    normal: 'Normal',
    low: 'Low',
  }

  return (
    <div className={`task-card ${isDuplicate ? 'duplicate' : ''}`}>
      <div className="task-header">
        <div className="task-checkbox">
          <input
            type="checkbox"
            id={`task-${id}`}
            onChange={(e) => onSelect(e.target.checked)}
            disabled={isDuplicate}
          />
        </div>

        <div className="task-title-section">
          <label htmlFor={`task-${id}`} className="task-title">
            {title}
          </label>
          {isDuplicate && <span className="duplicate-badge">Duplicate</span>}
        </div>

        <div className="task-priority" style={{ backgroundColor: priorityColors[priority] }}>
          {priorityLabels[priority]}
        </div>
      </div>

      {description && <p className="task-description">{description}</p>}

      <div className="task-footer">
        <div className="task-meta">
          {dueDate && (
            <span className="task-due-date">
              Due: {new Date(dueDate).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="task-assignment">
          <select
            value={selectedUserId || ''}
            onChange={(e) => onAssign(e.target.value)}
            disabled={isDuplicate}
            className="assignment-select"
          >
            <option value="">Assign to...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
