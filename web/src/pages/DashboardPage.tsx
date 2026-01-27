import { useState } from 'react'
import './DashboardPage.css'

export default function DashboardPage() {
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [meetings, setMeetings] = useState<any[]>([])
  const [selectedMeetings, setSelectedMeetings] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  async function fetchMeetings() {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/meetings/list?from=${fromDate}&to=${toDate}&limit=50`,
        { credentials: 'include' }
      )
      const data = await response.json()
      setMeetings(data.meetings || [])
    } catch (error) {
      console.error('Failed to fetch meetings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function toggleMeetingSelection(meetingId: string) {
    const newSelected = new Set(selectedMeetings)
    if (newSelected.has(meetingId)) {
      newSelected.delete(meetingId)
    } else {
      newSelected.add(meetingId)
    }
    setSelectedMeetings(newSelected)
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Context Orchestrator</h1>
        <p>Select meetings to process</p>
      </header>

      <main className="dashboard-main">
        <div className="controls-section">
          <div className="date-range">
            <div className="form-group">
              <label htmlFor="from-date">From Date</label>
              <input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="to-date">To Date</label>
              <input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          <button className="button button-primary" onClick={fetchMeetings} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Fetch Meetings'}
          </button>
        </div>

        <div className="meetings-section">
          <h2>
            Meetings ({meetings.length})
            {selectedMeetings.size > 0 && ` - ${selectedMeetings.size} selected`}
          </h2>

          {meetings.length === 0 ? (
            <p className="empty-state">No meetings found. Select a date range and click "Fetch Meetings".</p>
          ) : (
            <>
              <div className="meetings-list">
                {meetings.map((meeting) => (
                  <label key={meeting.id} className="meeting-item">
                    <input
                      type="checkbox"
                      checked={selectedMeetings.has(meeting.id)}
                      onChange={() => toggleMeetingSelection(meeting.id)}
                    />
                    <div className="meeting-info">
                      <div className="meeting-title">{meeting.title}</div>
                      <div className="meeting-meta">
                        {new Date(meeting.date).toLocaleDateString()}
                        {meeting.processed && <span className="badge">Processed</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="actions">
                <button
                  className="button button-primary"
                  disabled={selectedMeetings.size === 0}
                  onClick={() => {
                    // TODO: Process selected meetings
                    console.log('Processing:', Array.from(selectedMeetings))
                  }}
                >
                  Process {selectedMeetings.size} Meeting{selectedMeetings.size !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
