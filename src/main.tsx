import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ThemeProvider } from './theme/ThemeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <ThemeProvider><App /></ThemeProvider>
      </ErrorBoundary>
    </MotionConfig>
  </StrictMode>,
)
