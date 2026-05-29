import { create } from 'zustand'
import { tasks as mockTasks, type PublishTask } from '@/mock'

interface PublishState {
  tasks: PublishTask[]
  selectedTask: PublishTask | null
  setSelectedTask: (t: PublishTask | null) => void
}

export const usePublishStore = create<PublishState>((set) => ({
  tasks: mockTasks,
  selectedTask: null,
  setSelectedTask: (t) => set({ selectedTask: t }),
}))
