import axios, { AxiosInstance } from 'axios'

const API_BASE = '/api'

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Authentication
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const response = await apiClient.get('/auth/user')
    return !!response.data
  } catch (error) {
    return false
  }
}

export async function loginWithMicrosoft(): Promise<void> {
  window.location.href = '/auth/microsoft'
}

export async function getUser() {
  const response = await apiClient.get('/auth/user')
  return response.data
}

export async function updateUserConfig(clickupListId: string, clickupTeamId: string) {
  const response = await apiClient.post('/auth/user', {
    clickupListId,
    clickupTeamId,
  })
  return response.data
}

// Meetings
export interface Meeting {
  id: string
  title: string
  date: string
  processed: boolean
}

export async function listMeetings(
  fromDate: string,
  toDate: string,
  limit: number = 50
): Promise<Meeting[]> {
  const response = await apiClient.get('/meetings/list', {
    params: { from: fromDate, to: toDate, limit },
  })
  return response.data.meetings
}

export interface ProcessMeetingsRequest {
  meetingIds: string[]
}

export interface ProcessMeetingsResponse {
  sessionId: string
  totalMeetings: number
  totalTasks: number
  duplicates: number
}

export async function processMeetings(
  meetingIds: string[]
): Promise<ProcessMeetingsResponse> {
  const response = await apiClient.post('/meetings/process', {
    meetingIds,
  })
  return response.data
}

// Tasks
export interface Task {
  id: string
  title: string
  description: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  dueDate?: string
  isDuplicate: boolean
  duplicateOf?: string
  assignedTo?: string
  clickupTaskId?: string
}

export interface User {
  id: string
  email: string
  displayName: string
}

export interface ListTasksResponse {
  tasks: Task[]
  users: User[]
}

export async function listTasks(sessionId: string): Promise<ListTasksResponse> {
  const response = await apiClient.get(`/tasks/list`, {
    params: { sessionId },
  })
  return response.data
}

export interface CreateTasksRequest {
  taskIds: string[]
  assignments: { taskId: string; userId: string }[]
}

export interface CreateTasksResponse {
  created: number
  failed: number
  message: string
}

export async function createTasks(
  sessionId: string,
  taskIds: string[],
  assignments: { taskId: string; userId: string }[]
): Promise<CreateTasksResponse> {
  const response = await apiClient.post('/tasks/create', {
    sessionId,
    taskIds,
    assignments,
  })
  return response.data
}

export default apiClient
