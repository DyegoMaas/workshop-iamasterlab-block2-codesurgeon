'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getAllEtapas } from './data'

export interface ProgressState {
  // Progresso atual - índice da etapa atual na lista de todas as etapas
  currentStepIndex: number
  
  // Etapas completadas (por ID único: desafioId-etapaId)
  completedSteps: Set<string>
  
  // Progresso dos checklists (stepId -> Set de checklistItemIds completados)
  checklistProgress: Record<string, Set<string>>
  
  // Respostas das perguntas (stepId -> perguntaId -> resposta)
  questionResponses: Record<string, Record<string, string>>
  
  // Ações
  nextStep: () => void
  completeCurrentStep: () => void
  reset: () => void
  goToStep: (index: number) => void
  toggleChecklistItem: (stepId: string, itemId: string) => void
  saveQuestionResponse: (stepId: string, questionId: string, response: string) => void
  
  // Getters
  getCurrentStep: () => { desafioId: string; etapaId: string } | null
  isStepCompleted: (desafioId: string, etapaId: string) => boolean
  getTotalSteps: () => number
  getCompletionPercentage: () => number
  getChecklistProgressForStep: (stepId: string) => { completed: number; total: number } | null
  getQuestionResponse: (stepId: string, questionId: string) => string
  getQuestionResponsesForStep: (stepId: string) => Record<string, string>
}

const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      currentStepIndex: 0,
      completedSteps: new Set<string>(),
      checklistProgress: {},
      questionResponses: {},
      
      nextStep: () => {
        const allEtapas = getAllEtapas()
        const currentIndex = get().currentStepIndex
        
        if (currentIndex < allEtapas.length - 1) {
          set({ currentStepIndex: currentIndex + 1 })
        }
      },
      
      completeCurrentStep: () => {
        const allEtapas = getAllEtapas()
        const currentIndex = get().currentStepIndex
        const currentEtapa = allEtapas[currentIndex]
        
        if (currentEtapa) {
          const stepId = `${currentEtapa.desafio.id}-${currentEtapa.etapa.id}`
          const newCompleted = new Set(get().completedSteps)
          newCompleted.add(stepId)
          
          set({ 
            completedSteps: newCompleted,
            currentStepIndex: Math.min(currentIndex + 1, allEtapas.length - 1)
          })
        }
      },
      
      reset: () => {
        set({
          currentStepIndex: 0,
          completedSteps: new Set<string>(),
          checklistProgress: {},
          questionResponses: {}
        })
      },
      
      goToStep: (index: number) => {
        const allEtapas = getAllEtapas()
        if (index >= 0 && index < allEtapas.length) {
          set({ currentStepIndex: index })
        }
      },
      
      getCurrentStep: () => {
        const allEtapas = getAllEtapas()
        const currentIndex = get().currentStepIndex
        const currentEtapa = allEtapas[currentIndex]
        
        if (currentEtapa) {
          return {
            desafioId: currentEtapa.desafio.id,
            etapaId: currentEtapa.etapa.id
          }
        }
        return null
      },
      
      isStepCompleted: (desafioId: string, etapaId: string) => {
        const stepId = `${desafioId}-${etapaId}`
        return get().completedSteps.has(stepId)
      },
      
      getTotalSteps: () => {
        return getAllEtapas().length
      },
      
      getCompletionPercentage: () => {
        const total = getAllEtapas().length
        const completed = get().completedSteps.size
        return total > 0 ? Math.round((completed / total) * 100) : 0
      },
      
      getChecklistProgressForStep: (stepId: string) => {
        const step = getAllEtapas().find(e => `${e.desafio.id}-${e.etapa.id}` === stepId)
        if (step && step.etapa.checklist) {
          const completed = get().checklistProgress[stepId]?.size || 0
          const total = step.etapa.checklist.length
          return { completed, total }
        }
        return null
      },
      
      toggleChecklistItem: (stepId: string, itemId: string) => {
        const allEtapas = getAllEtapas()
        const step = allEtapas.find(e => `${e.desafio.id}-${e.etapa.id}` === stepId)
        if (step) {
          const newChecklistProgress = { ...get().checklistProgress }
          const currentCompleted = newChecklistProgress[stepId] || new Set<string>()
          const newCompleted = new Set(currentCompleted)
          
          if (currentCompleted.has(itemId)) {
            newCompleted.delete(itemId)
          } else {
            newCompleted.add(itemId)
          }
          
          newChecklistProgress[stepId] = newCompleted
          set({ checklistProgress: newChecklistProgress })
        }
      },
      
      saveQuestionResponse: (stepId: string, questionId: string, response: string) => {
        const newQuestionResponses = { ...get().questionResponses }
        if (!newQuestionResponses[stepId]) {
          newQuestionResponses[stepId] = {}
        }
        newQuestionResponses[stepId][questionId] = response
        set({ questionResponses: newQuestionResponses })
      },
      
      getQuestionResponse: (stepId: string, questionId: string) => {
        return get().questionResponses[stepId]?.[questionId] || ''
      },
      
      getQuestionResponsesForStep: (stepId: string) => {
        return get().questionResponses[stepId] || {}
      }
    }),
    {
      name: 'tower-progress',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ...state,
        completedSteps: Array.from(state.completedSteps),
        checklistProgress: Object.fromEntries(Object.entries(state.checklistProgress).map(([k, v]) => [k, Array.from(v)])),
        questionResponses: Object.fromEntries(Object.entries(state.questionResponses).map(([k, v]) => [k, Object.fromEntries(Object.entries(v))]))
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray((state as unknown as { completedSteps: string[] }).completedSteps)) {
          state.completedSteps = new Set((state as unknown as { completedSteps: string[] }).completedSteps)
        }
        if (state && state.checklistProgress && typeof state.checklistProgress === 'object') {
          const checklistProgress: Record<string, Set<string>> = {}
          Object.entries(state.checklistProgress).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              checklistProgress[key] = new Set(value as string[])
            }
          })
          state.checklistProgress = checklistProgress
        }
        if (state && state.questionResponses && typeof state.questionResponses === 'object') {
          const questionResponses: Record<string, Record<string, string>> = {}
          Object.entries(state.questionResponses).forEach(([key, value]) => {
            if (typeof value === 'object' && !Array.isArray(value)) {
              questionResponses[key] = Object.fromEntries(Object.entries(value))
            }
          })
          state.questionResponses = questionResponses
        }
      }
    }
  )
)

export default useProgressStore 