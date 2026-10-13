import { ref } from 'vue'

// The page keeps its last frame while the full-screen book owns the animation budget.
export const bookTransitionActive = ref(false)
