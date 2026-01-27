import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './ProcessingPage.css'

export default function ProcessingPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(true)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Initializing...')

  useEffect(() => {
    // Simulate processing
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) {
          setStatus('Finalizing...')
          return p
        }
        setProgress(p + Math.random() * 20)
        const statuses = [
          'Fetching meetings...',
          'Extracting tasks with Claude AI...',
          'Checking for duplicates...',
          'Deduplicating tasks...',
          'Preparing results...',
        ]
        setStatus(statuses[Math.floor(p / 20)])
        return p + Math.random() * 20
      })
    }, 1000)

    // Simulate completion
    setTimeout(() => {
      setProgress(100)
      setStatus('Complete! Redirecting to task review...')
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 1500)
    }, 5000)

    return () => clearInterval(interval)
  }, [navigate])

  return (
    <div className="processing-container">
      <div className="processing-card">
        <h1>Processing Meetings</h1>
        <p>Session: {sessionId}</p>

        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">{Math.round(progress)}%</p>
        </div>

        <div className="status-section">
          <div className="spinner"></div>
          <p className="status">{status}</p>
        </div>

        <div className="info-box">
          <p>
            This may take a few moments. We're analyzing your meetings with Claude AI and checking for duplicate tasks.
          </p>
        </div>
      </div>
    </div>
  )
}
