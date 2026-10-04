import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AppStateProvider, useApp } from './state/AppState'
import { BadgesScreen } from './screens/BadgesScreen'
import { Home } from './screens/Home'
import { LessonScreen } from './screens/LessonScreen'
import { Onboarding } from './screens/Onboarding'
import { ParentScreen } from './screens/ParentScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { StoriesScreen } from './screens/StoriesScreen'
import { StoryScreen } from './screens/StoryScreen'

// Remount when the id changes, so a new lesson or chapter never inherits the old one's state.
function KeyedLesson() {
  return <LessonScreen key={useParams().lessonId} />
}
function KeyedStory() {
  return <StoryScreen key={useParams().chapterId} />
}

function AppRoutes() {
  const { state, t } = useApp()
  if (!state.settings.onboarded)
    return (
      <Routes>
        <Route path="/parent" element={<ParentScreen />} />
        <Route path="*" element={<Onboarding />} />
      </Routes>
    )
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route path="/lesson/:lessonId" element={<KeyedLesson />} />
      <Route path="/practice" element={<PracticeScreen />} />
      <Route path="/stories" element={<StoriesScreen />} />
      <Route path="/story/:chapterId" element={<KeyedStory />} />
      <Route path="/badges" element={<BadgesScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="/parent" element={<ParentScreen />} />
      <Route path="*" element={<Layout><p className="text-xl">{t('notFound')}</p></Layout>} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      {/* Hash routing works on any static host without server rewrites. */}
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppStateProvider>
  )
}
