import LaunchTitleSplash from '../launch/LaunchTitleSplash'

interface TutorialFinaleProps {
  onDone: () => void
}

export default function TutorialFinale({ onDone }: TutorialFinaleProps) {
  return <LaunchTitleSplash onDone={onDone} />
}
