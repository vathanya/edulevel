import React from 'react';
import { EduProvider, useEdu } from './context/EduContext';
import { LoginScreen } from './components/LoginScreen';
import { StudentShell } from './components/student/StudentShell';
import { LearningWorld } from './components/student/LearningWorld';
import { IslandDetailScreen } from './components/student/IslandDetailScreen';
import { PhysicsLab3D } from './components/student/PhysicsLab3D';
import { AIMentorScreen } from './components/student/AIMentorScreen';
import { CounterfactualScreen } from './components/student/CounterfactualScreen';
import { MasteryGateScreen } from './components/student/MasteryGateScreen';
import { ProgressScreen } from './components/student/ProgressScreen';
import { AdaptiveQuestionsScreen } from './components/student/AdaptiveQuestionsScreen';
import { RevisionScreen } from './components/student/RevisionScreen';
import { ProfileScreen, RewardsScreen } from './components/student/RewardsProfileScreen';
import { DiagnosticScreen } from './components/student/DiagnosticScreen';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';

const AppRouter: React.FC = () => {
  const { role, studentView } = useEdu();
  const isCinematic =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('cinematic') === '1';

  if (isCinematic) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#060B1E]">
        <LearningWorld cinematicMode />
      </div>
    );
  }

  if (role === null) {
    return <LoginScreen />;
  }

  if (role === 'teacher') {
    return <TeacherDashboard />;
  }

  const renderStudentView = () => {
    switch (studentView) {
      case 'world':
        return <LearningWorld />;
      case 'island-detail':
        return <IslandDetailScreen />;
      case 'lab':
        return <PhysicsLab3D />;
      case 'mentor':
        return <AIMentorScreen />;
      case 'counterfactual':
        return <CounterfactualScreen />;
      case 'mastery-gate':
        return <MasteryGateScreen />;
      case 'progress':
        return <ProgressScreen />;
      case 'questions':
        return <AdaptiveQuestionsScreen />;
      case 'revision':
        return <RevisionScreen />;
      case 'rewards':
        return <RewardsScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'diagnostic':
        return <DiagnosticScreen />;
      default:
        return <LearningWorld />;
    }
  };

  return <StudentShell>{renderStudentView()}</StudentShell>;
};

export const App: React.FC = () => {
  return (
    <EduProvider>
      <AppRouter />
    </EduProvider>
  );
};

export default App;
